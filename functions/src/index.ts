import * as admin from "firebase-admin";
import { setGlobalOptions } from "firebase-functions/v2";
import { onRequest } from "firebase-functions/v2/https";

admin.initializeApp();
setGlobalOptions({
  region: "asia-southeast2",
  serviceAccount: "REDACTED_SERVICE_ACCOUNT",
});

interface FlagValue {
  enabled: boolean;
  [key: string]: unknown;
}

interface ConditionPayload {
  name: string;
  companyIds: string[];
  value: FlagValue;
}

interface WebhookPayload {
  flagName: string;
  flagValue: FlagValue;
  webhookSecret: string;
  condition?: ConditionPayload;
}

function buildCompanyIdExpression(companyIds: string[]): string {
  const regex = `^(${companyIds.join("|")})$`;
  return `device.userProperty['COMPANY_ID'].contains('${regex}')`;
}

export const syncFeatureFlag = onRequest(async (req, res) => {
  // Only allow POST requests
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  const { flagName, flagValue, webhookSecret, condition } = req.body as WebhookPayload;

  if (webhookSecret !== process.env.WEBHOOK_SECRET) {
    res.status(401).send("Unauthorized");
    return;
  }

  if (!flagName || flagValue === undefined) {
    res.status(400).send("Bad Request: Missing flagName or flagValue");
    return;
  }

  try {
    const remoteConfig = admin.remoteConfig();
    const template = await remoteConfig.getTemplate();

    if (!template.parameters[flagName]) {
      res.status(404).send({ error: `Flag "${flagName}" not found in Remote Config` });
      return;
    }

    // Update default value, preserving existing conditional values
    template.parameters[flagName] = {
      ...template.parameters[flagName],
      defaultValue: { value: JSON.stringify(flagValue) },
      valueType: "JSON",
    };

    // Update condition and its conditional value if provided
    if (condition) {
      const expression = buildCompanyIdExpression(condition.companyIds);

      const existingIndex = template.conditions.findIndex((c) => c.name === condition.name);
      if (existingIndex >= 0) {
        template.conditions[existingIndex].expression = expression;
      } else {
        template.conditions.push({ name: condition.name, expression });
      }

      template.parameters[flagName].conditionalValues = {
        ...template.parameters[flagName].conditionalValues,
        [condition.name]: { value: JSON.stringify(condition.value) },
      };
    }

    await remoteConfig.validateTemplate(template);
    await remoteConfig.publishTemplate(template);

    res.status(200).send({ success: true, message: `Synced ${flagName}` });
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string; errorInfo?: object };
    console.error("Firebase API Error:", JSON.stringify({
      code: err.code,
      message: err.message,
      errorInfo: err.errorInfo,
      flagName,
      condition: condition?.name,
    }));
    res.status(500).send({
      error: "Failed to update Remote Config",
      code: err.code,
      message: err.message,
    });
  }
});
