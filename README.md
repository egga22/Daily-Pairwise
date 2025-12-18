# PairWise Ranking Web App

This repository contains a lightweight, client-side web application that helps you rank a list of ideas using the pairwise comparison technique.

## Features

- **Firebase Authentication**: Secure email/password authentication
- **Pairwise Comparison**: Intelligent ranking algorithm that minimizes comparisons
- **Progress Tracking**: Visual progress bar and statistics
- **Responsive Design**: Works on desktop and mobile devices

## Getting started

1. Open [`index.html`](index.html) in your browser.
2. **Sign in or create an account** using your email and password.
3. Paste a list of items (one per line or separated with commas).
4. Step through the comparisons by picking the option you prefer each time.
5. Review the final ordered list generated from your choices.

The app performs an insertion sort guided by your selections, minimizing the total number of comparisons needed to produce the final ranking.

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

No build step or server is required—the project uses plain HTML, CSS, and vanilla JavaScript. To iterate quickly, open `index.html` with a live-reload capable development server such as `npx serve` or `python -m http.server`.
