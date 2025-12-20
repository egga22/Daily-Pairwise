const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const Mailjet = require('node-mailjet');
const admin = require('firebase-admin');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'noreply@daily-pairwise.com';
const SENDER_NAME = process.env.SENDER_NAME || 'Daily Pairwise';

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Mailjet
const mailjet = Mailjet.apiConnect(
  process.env.MAILJET_API_KEY,
  process.env.MAILJET_SECRET_KEY
);

// Initialize Firebase Admin (you'll need to add service account credentials)
// For now, we'll use the client SDK configuration
// In production, you should use Firebase Admin SDK with service account

// Store for tracking sent pairs (in production, use a database)
const sentPairs = new Map();

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend service is running' });
});

// Handle preference selection from email
app.get('/api/choice/:listId/:pairId/:choice', async (req, res) => {
  const { listId, pairId, choice } = req.params;
  
  try {
    // Store the choice (in production, update Firestore)
    console.log(`Choice recorded: List ${listId}, Pair ${pairId}, Choice: ${choice}`);
    
    // Redirect to the web app to continue ranking
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
    res.redirect(`${frontendUrl}?list=${listId}&continue=true`);
  } catch (error) {
    console.error('Error recording choice:', error);
    res.status(500).json({ error: 'Failed to record choice' });
  }
});

// Send test email
app.post('/api/send-test-email', async (req, res) => {
  const { email, itemA, itemB, listId, pairId } = req.body;
  
  if (!email || !itemA || !itemB) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  try {
    await sendPairwiseEmail(email, itemA, itemB, listId || 'test', pairId || '1');
    res.json({ success: true, message: 'Test email sent successfully' });
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({ error: 'Failed to send email', details: error.message });
  }
});

// Function to send pairwise comparison email
async function sendPairwiseEmail(toEmail, itemA, itemB, listId, pairId) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
  const choiceUrlA = `http://localhost:${PORT}/api/choice/${listId}/${pairId}/a`;
  const choiceUrlB = `http://localhost:${PORT}/api/choice/${listId}/${pairId}/b`;
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background-color: #f6f8fb;
          margin: 0;
          padding: 20px;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: white;
          border-radius: 8px;
          padding: 30px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 {
          color: #1f2a44;
          text-align: center;
          margin-bottom: 10px;
        }
        .subtitle {
          color: #5f6b8a;
          text-align: center;
          margin-bottom: 30px;
        }
        .question {
          color: #1f2a44;
          font-size: 18px;
          text-align: center;
          margin-bottom: 30px;
          font-weight: 500;
        }
        .options {
          display: flex;
          flex-direction: column;
          gap: 15px;
          margin-bottom: 30px;
        }
        .option-button {
          display: block;
          width: 100%;
          padding: 20px;
          background-color: #4a90e2;
          color: white;
          text-decoration: none;
          text-align: center;
          border-radius: 6px;
          font-size: 16px;
          font-weight: 500;
          transition: background-color 0.2s;
        }
        .option-button:hover {
          background-color: #357abd;
        }
        .vs {
          text-align: center;
          color: #5f6b8a;
          font-weight: bold;
          font-size: 20px;
        }
        .footer {
          text-align: center;
          color: #5f6b8a;
          font-size: 14px;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e1e8ed;
        }
        .footer a {
          color: #4a90e2;
          text-decoration: none;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🎯 Daily Pairwise Ranking</h1>
        <p class="subtitle">Your daily comparison is ready!</p>
        
        <p class="question">Which item do you prefer?</p>
        
        <div class="options">
          <a href="${choiceUrlA}" class="option-button">
            ${escapeHtml(itemA)}
          </a>
          
          <div class="vs">vs</div>
          
          <a href="${choiceUrlB}" class="option-button">
            ${escapeHtml(itemB)}
          </a>
        </div>
        
        <div class="footer">
          <p>Click one of the options above to make your choice.</p>
          <p>Want to answer more questions? <a href="${frontendUrl}?list=${listId}">Continue on the website</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const request = mailjet
    .post('send', { version: 'v3.1' })
    .request({
      Messages: [
        {
          From: {
            Email: SENDER_EMAIL,
            Name: SENDER_NAME
          },
          To: [
            {
              Email: toEmail
            }
          ],
          Subject: '🎯 Your Daily Pairwise Comparison',
          HTMLPart: htmlContent,
          TextPart: `Daily Pairwise Ranking\n\nWhich item do you prefer?\n\nOption A: ${itemA}\n\nOption B: ${itemB}\n\nVisit ${frontendUrl}?list=${listId} to make your choice and continue ranking.`
        }
      ]
    });
  
  return await request;
}

// Function to escape HTML to prevent XSS
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// Cron job to send daily emails (runs every day at different times based on user preferences)
// This is a simplified version - in production, you'd query Firestore for users with daily mode enabled
cron.schedule('0 * * * *', async () => {
  console.log('Checking for scheduled emails...');
  
  // In production:
  // 1. Query Firestore for lists with dailyMode: true and matching time
  // 2. For each list, get the next unpaired comparison
  // 3. Send email with the comparison
  // 4. Mark the pair as sent
  
  // Example pseudocode:
  // const lists = await getDailyModeLists(currentHour);
  // for (const list of lists) {
  //   const nextPair = getNextComparison(list);
  //   if (nextPair) {
  //     await sendPairwiseEmail(list.userEmail, nextPair.itemA, nextPair.itemB, list.id, nextPair.id);
  //   }
  // }
});

// Start server
app.listen(PORT, () => {
  console.log(`Backend service running on port ${PORT}`);
  console.log(`Mailjet API configured: ${!!process.env.MAILJET_API_KEY}`);
});

module.exports = app;
