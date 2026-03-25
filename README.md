# syncFeatureFlag

A Firebase Cloud Function that syncs feature flags to Firebase Remote Config. It supports updating default flag values and creating/updating conditions to target specific companies by `COMPANY_ID`.

## Tech Stack

- **Runtime:** Node.js 24
- **Language:** TypeScript
- **Platform:** Firebase Cloud Functions v2
- **Firebase Project:** qontak-crm

## Setup

### Prerequisites

- Node.js 24+
- Firebase CLI (`npm install -g firebase-tools`)
- Firebase project with Remote Config enabled

### Install Dependencies

```bash
cd functions
npm install
```

### Environment Variables

Create a `.env` file in the `functions/` directory:

```env
WEBHOOK_SECRET=your_webhook_secret
REGION=asia-southeast2
SERVICE_ACCOUNT=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
```

| Variable | Description |
|----------|-------------|
| `WEBHOOK_SECRET` | Secret used to authenticate incoming requests |
| `REGION` | GCP region for the cloud function deployment |
| `SERVICE_ACCOUNT` | Firebase Admin SDK service account email |

## Deployment

```bash
firebase deploy --only functions
```

## API

### Endpoint

`POST <CLOUD_FUNCTION_URL>`

### Authentication

Include `webhookSecret` in the request body. It must match the `WEBHOOK_SECRET` env var.

### Request Payload

```json
{
  "flagName": "string (required)",
  "flagValue": { "enabled": true },
  "webhookSecret": "string (required)",
  "condition": {
    "name": "string",
    "companyIds": ["string"],
    "value": { "enabled": true }
  }
}
```

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

### Response Codes

| Code | Meaning |
|------|---------|
| 200 | `{ success: true, message: "Synced {flagName}" }` |
| 400 | Missing `flagName` or `flagValue` |
| 401 | Invalid `webhookSecret` |
| 404 | `flagName` not found in Remote Config |
| 405 | Not a POST request |
| 500 | Firebase API error (`{ error, code, message }`) |

### How It Works

1. Validates the request method (POST only) and webhook secret
2. Looks up the flag in the existing Remote Config template
3. Updates the default value for the flag
4. If a `condition` is provided:
   - Merges new `companyIds` into the existing condition (deduplicates automatically)
   - Or creates a new condition if it doesn't exist
   - Generates a regex expression: `app.userProperty['COMPANY_ID'].matches(['^(id1|id2)$'])`
5. Validates and publishes the updated template

## Usage Examples

See [API_EXAMPLES.md](API_EXAMPLES.md) for detailed curl examples covering:

1. Updating default flag values
2. Creating conditions with company IDs
3. Merging company IDs into existing conditions
