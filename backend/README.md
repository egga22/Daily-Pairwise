# Daily Pairwise Backend Service

This backend service handles email notifications for the Daily Pairwise ranking application using the Mailjet API.

## Features

- Send daily pairwise comparison emails to users
- Handle preference selections via email links
- Schedule emails based on user preferences
- Integrate with Firebase Firestore for data persistence

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Update the Mailjet API credentials (already configured)
   - Set the frontend URL

3. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## API Endpoints

### Health Check
```
GET /api/health
```

### Record Choice from Email
```
GET /api/choice/:listId/:pairId/:choice
```
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

## Email Scheduler

The service includes a cron job that runs hourly to check for scheduled emails. Users can set their preferred time for receiving daily comparisons.

## Mailjet Configuration

The service uses Mailjet API for sending emails. Configure your Mailjet credentials in the `.env` file:

```
MAILJET_API_KEY=your_mailjet_api_key
MAILJET_SECRET_KEY=your_mailjet_secret_key
SENDER_EMAIL=noreply@yourdomain.com
SENDER_NAME=Daily Pairwise
```

**Important**: Make sure your sender email domain is verified with Mailjet before sending emails in production.

## Integration with Frontend

The backend works with the Daily Pairwise frontend application. When users select "Daily Mode":
1. Their email and preferred time are stored in Firestore
2. Daily emails are sent at the specified time
3. Users can click options in the email to record their preference
4. Clicking redirects them to the web app to continue if desired
