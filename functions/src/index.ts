import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Automatically uses the default service account
admin.initializeApp();

// 1. Define the exact shape of the payload
interface WebhookPayload {
    flag_name: string;
    flag_value: {
        enabled: boolean;
        [key: string]: any; // Allow for additional properties
    }
    webhook_secret: string;
}

export const syncFeatureFlag = functions.https.onRequest(async (req, res) => {
    // 2. Only allow POST requests
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }

    // 3. Cast the incoming request body to our strict TS interface
    const { flag_name, flag_value, webhook_secret } = req.body as WebhookPayload;

    // 4. Verify the secret key mathces .env file
    if (webhook_secret !== process.env.WEBHOOK_SECRET) {
        res.status(401).send('Unauthorized');
        return;
    }

    // Validate backend actually sent the data
    if (!flag_name || flag_value === undefined) {
        res.status(400).send('Bad Request: Missing flag_name or flag_value');
        return;
    }

    try {
        const remoteConfig = admin.remoteConfig();

        // 5. Fetch, modify, and publish the template
        const template = await remoteConfig.getTemplate();

        template.parameters[flag_name] = {
            defaultValue: {
                value: JSON.stringify(flag_value)
            },
            valueType: 'JSON',
        }

        await remoteConfig.validateTemplate(template);
        await remoteConfig.publishTemplate(template);

        res.status(200).send({ success: true, message: `Synced ${flag_name}` });
    } catch (error) {
        console.error("Firebase API Error:", error);
        res.status(500).send({ error: "Failed to update Remote Config" });
    }
});