# Daily Pairwise Cloudflare Worker

This directory contains the Cloudflare Worker that handles email notifications for the Daily Pairwise ranking application.

## Features

- Send daily pairwise comparison emails via Mailjet API
- Handle preference selections via email links with redirect to frontend
- Scheduled cron job (hourly) to send daily emails
- RESTful API endpoints for the frontend
- Native `fetch()` API - no external dependencies needed

## Setup

### Prerequisites

1. A Cloudflare account
2. Wrangler CLI installed globally: `npm install -g wrangler`
3. Mailjet API credentials (API Key and Secret Key)
4. A verified sender email address in Mailjet

### Installation

1. Install dependencies:
```bash
npm install
```

2. Login to Cloudflare:
```bash
wrangler login
```

3. Configure secrets (these are encrypted and not stored in the code):
```bash
wrangler secret put MAILJET_API_KEY
# Enter your Mailjet API key when prompted

wrangler secret put MAILJET_SECRET_KEY
# Enter your Mailjet Secret key when prompted

wrangler secret put SENDER_EMAIL
# Enter your verified sender email (e.g., noreply@yourdomain.com)

wrangler secret put SENDER_NAME
# Enter your sender name (e.g., "Daily Pairwise")
```

4. Deploy the worker to get your worker URL:
```bash
npm run deploy
# or
wrangler deploy
```

After deployment, Wrangler will output your worker's URL (e.g., `https://daily-pairwise.YOUR-SUBDOMAIN.workers.dev`).

5. Update `wrangler.toml` with your worker URL and frontend URL:
```toml
[vars]
FRONTEND_URL = "https://egga22.github.io/Daily-Pairwise"  # Your frontend URL
WORKER_URL = "https://daily-pairwise.YOUR-SUBDOMAIN.workers.dev"  # Your worker URL from step 4
```

6. Redeploy with the updated configuration:
```bash
wrangler deploy
```

### Development

Run the worker locally:
```bash
npm run dev
# or
wrangler dev
```

This starts a local development server. Note: Scheduled events (cron) won't trigger in local development.

### Deployment

Deploy to Cloudflare:
```bash
npm run deploy
# or
wrangler deploy
```

After deployment, Wrangler will output your worker's URL, which will look like:
```
https://daily-pairwise.YOUR-SUBDOMAIN.workers.dev
```

Remember to update this URL in:
1. The worker's `src/index.js` file (line 170)
2. The frontend's `script.js` file (update `BACKEND_URL` constant)

## API Endpoints

### Health Check
```
GET /api/health
```
Returns worker status.

### Handle Email Choice
```
GET /api/choice/:listId/:pairId/:choice
```
Handles when users click an option in the email. Redirects to the frontend.

Parameters:
- `listId`: ID of the ranking list
- `pairId`: ID of the comparison pair  
- `choice`: 'a' or 'b'

### Send Test Email
```
POST /api/send-test-email
```

Body:
```json
{
  "email": "user@example.com",
  "itemA": "First Option",
  "itemB": "Second Option",
  "listId": "optional-list-id",
  "pairId": "optional-pair-id"
}
```

Response:
```json
{
  "success": true,
  "message": "Test email sent successfully"
}
```

## Scheduled Events

The worker includes a cron trigger that runs every hour (`0 * * * *`). This can be configured in `wrangler.toml`.

In production, this would:
1. Query the database for lists with daily mode enabled
2. Check which users should receive emails at the current hour
3. Send pairwise comparison emails to those users

## Environment Variables

Set in `wrangler.toml`:
- `FRONTEND_URL`: URL of the frontend application (default: `https://egga22.github.io/Daily-Pairwise`)
- `WORKER_URL`: URL of the deployed worker (e.g., `https://daily-pairwise.YOUR-SUBDOMAIN.workers.dev`)
  - **Required** for email choice links to work properly
  - Without this, email links will redirect to the frontend but won't automatically record choices
  - Users will need to manually continue their ranking session on the website

Set as secrets (encrypted):
- `MAILJET_API_KEY`: Your Mailjet API key
- `MAILJET_SECRET_KEY`: Your Mailjet secret key
- `SENDER_EMAIL`: Verified sender email address
- `SENDER_NAME`: Name to appear in sent emails

## Testing

To test the email functionality:

1. Deploy the worker
2. Use the frontend application's "Daily Mode" to send a test email
3. Or use curl:
```bash
curl -X POST https://your-worker-url/api/send-test-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "itemA": "Option A",
    "itemB": "Option B"
  }'
```

## Monitoring

View logs in real-time:
```bash
wrangler tail
```

View logs in the Cloudflare dashboard:
1. Go to Workers & Pages
2. Select your worker
3. Click on the "Logs" tab

## Troubleshooting

### Emails not sending
- Verify your Mailjet credentials are correct
- Ensure your sender email is verified in Mailjet
- Check worker logs for errors: `wrangler tail`

### CORS errors from frontend
- The worker includes CORS headers for all origins (`*`)
- If you need to restrict origins, update the `getCORSHeaders()` function

### Scheduled events not running
- Verify the cron trigger is configured in `wrangler.toml`
- Check worker logs around the scheduled time
- Note: Cron triggers don't work in local development (`wrangler dev`)

## Architecture Notes

- Uses Cloudflare Workers' native `fetch()` API - no external HTTP libraries needed
- Stateless - all state should be stored in Firestore (to be implemented)
- Follows Cloudflare Workers best practices for performance and security
- Secrets are encrypted and never exposed in code or logs

## Future Enhancements

- Integrate with Firestore for list/user data
- Implement actual scheduled email logic based on user preferences
- Add rate limiting
- Add email delivery tracking
- Support multiple email providers (not just Mailjet)
