# PairWise Ranking Web App

This repository contains a lightweight, client-side web application that helps you rank a list of ideas using the pairwise comparison technique.

## Features

- **Firebase Authentication**: Secure email/password authentication
- **Pairwise Comparison**: Intelligent ranking algorithm that minimizes comparisons
- **Basic Mode**: Complete all comparisons immediately on the website
- **Daily Mode**: Receive one pairwise comparison per day via email
- **Progress Tracking**: Visual progress bar and statistics
- **Responsive Design**: Works on desktop and mobile devices

## Ranking Modes

### Basic Mode
Complete all pairwise comparisons in one session directly on the website. Perfect for quick rankings or when you want to complete everything at once.

### Daily Mode
Receive one pairwise comparison per day via email at your preferred time. This mode is ideal for:
- Thoughtful decision-making over time
- Avoiding decision fatigue
- Reflecting on choices day by day

When you select Daily Mode:
1. Choose your preferred time for daily emails
2. Receive an email with two options to compare
3. Click your preferred option directly in the email
4. Come back to the website anytime to complete more comparisons

## Getting started

1. Open [`index.html`](index.html) in your browser.
2. **Sign in or create an account** using your email and password.
3. Paste a list of items (one per line or separated with commas).
4. **Choose your ranking mode**:
   - **Basic Mode**: Start ranking immediately
   - **Daily Mode**: Set your email and preferred time for daily comparisons
5. Step through the comparisons by picking the option you prefer each time.
6. Review the final ordered list generated from your choices.

The app performs an insertion sort guided by your selections, minimizing the total number of comparisons needed to produce the final ranking.

## Backend Service

The Daily Mode feature requires a backend service to send emails. The application supports two backend options:

### Option 1: Cloudflare Workers (Recommended)

The recommended deployment uses Cloudflare Workers for serverless, scalable email handling. See the [workers README](workers/README.md) for detailed setup instructions.

Quick start:
```bash
# Install Wrangler CLI globally
npm install -g wrangler

# Navigate to workers directory
cd workers

# Install dependencies
npm install

# Login to Cloudflare
wrangler login

# Set secrets (API keys, sender email)
wrangler secret put MAILJET_API_KEY
wrangler secret put MAILJET_SECRET_KEY
wrangler secret put SENDER_EMAIL
wrangler secret put SENDER_NAME

# Deploy to Cloudflare
wrangler deploy

# After deployment, update wrangler.toml with your worker URL and redeploy
# Edit workers/wrangler.toml to add: WORKER_URL = "https://your-worker-url.workers.dev"
wrangler deploy
```

After deployment, update the worker URL in `workers/wrangler.toml` (set the `WORKER_URL` variable) and update the backend URL in `script.js` if deploying to production.

### Option 2: Express.js Backend (Legacy)

For local development or alternative deployment, you can use the Express.js backend. See the [backend README](backend/README.md) for setup instructions.

To run the backend locally:
```bash
cd backend
npm install
npm start
```

Both backends use the Mailjet API for sending emails.

## Firebase Authentication

The app uses Firebase Authentication to secure access. Users must sign in with an email and password before they can use the ranking functionality.

### Firebase Configuration

The Firebase configuration is already set up in `index.html`. The API key and project details are safe to include in client-side code because:
- Firebase API keys identify your project but don't grant access
- Security is enforced through Firebase Security Rules on the server side
- The API key is required for the Firebase SDK to function

To use your own Firebase project:
1. Create a Firebase project at https://firebase.google.com
2. Enable Email/Password authentication in the Firebase Console
3. Replace the `firebaseConfig` object in `index.html` with your project's configuration

## Development notes

No build step or server is required for the frontend—the project uses plain HTML, CSS, and vanilla JavaScript. To iterate quickly, open `index.html` with a live-reload capable development server such as `npx serve` or `python -m http.server`.

For the backend service (Daily Mode emails), you'll need Node.js. See the backend directory for more information.
