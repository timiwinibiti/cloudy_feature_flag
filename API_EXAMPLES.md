# syncFeatureFlag API Examples

---

## 1. Update default value only

Updates the default value of an existing flag in Remote Config.

```bash
curl -X POST CLOUD_FUNCTION_URL \
  -H "Content-Type: application/json" \
  -d '{
    "flagName": "flag_name",
    "flagValue": { "enabled": true },
    "webhookSecret": "webhook_secret"
  }'
```

## 2. Create a new condition with company IDs

Creates a new condition targeting specific companies via `COMPANY_ID` user property, and sets a conditional value for the flag.

```bash
curl -X POST CLOUD_FUNCTION_URL \
  -H "Content-Type: application/json" \
  -d '{
    "flagName": "flag_name",
    "flagValue": { "enabled": false },
    "webhookSecret": "webhook_secret",
    "condition": {
      "name": "test_condition",
      "companyIds": ["133163", "154827"],
      "value": { "enabled": true }
    }
  }'
```

This sets:
- **Default:** `enabled: false` (off for everyone)
- **Condition `test_condition`:** `enabled: true` (on for companies 133163 and 154827)
- **Expression:** `app.userProperty['COMPANY_ID'].matches(['^(133163|154827)$'])`

## 3. Add company IDs to an existing condition

Sends new company IDs that get **merged** into the existing condition (duplicates are removed automatically).

```bash
curl -X POST CLOUD_FUNCTION_URL \
  -H "Content-Type: application/json" \
  -d '{
    "flagName": "flag_name",
    "flagValue": { "enabled": true },
    "webhookSecret": "webhook_secret",
    "condition": {
      "name": "test_condition",
      "companyIds": ["777777777777"],
      "value": { "enabled": true }
    }
  }'
```

If `test_condition` already has `^(133163|154827)$`, the result becomes `^(133163|154827|777777777777)$`.

---

## Payload Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `flagName` | string | Yes | Name of the flag in Remote Config |
| `flagValue` | object | Yes | Default value (`{ "enabled": true/false }`) |
| `webhookSecret` | string | Yes | Must match `WEBHOOK_SECRET` env var |
| `condition` | object | No | Condition to create or update |
| `condition.name` | string | Yes* | Condition name in Remote Config |
| `condition.companyIds` | string[] | Yes* | Company IDs to target |
| `condition.value` | object | Yes* | Flag value for matching companies |

\* Required when `condition` is provided.

## Response Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Missing `flagName` or `flagValue` |
| 401 | Invalid `webhookSecret` |
| 404 | `flagName` not found in Remote Config |
| 405 | Not a POST request |
| 500 | Firebase API error (check `code` and `message` in response) |
