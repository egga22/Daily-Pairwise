// Cloudflare Worker for Daily Pairwise
// Handles email notifications and API endpoints

export default {
  async fetch(request, env, ctx) {
    return handleRequest(request, env);
  },
  
  async scheduled(event, env, ctx) {
    return handleScheduled(event, env, ctx);
  }
};

async function handleRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  
  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return handleCORS();
  }
  
  // Route handlers
  if (path === '/api/health' && request.method === 'GET') {
    return handleHealth();
  }
  
  if (path.startsWith('/api/choice/') && request.method === 'GET') {
    return handleChoice(path, env);
  }
  
  if (path === '/api/send-test-email' && request.method === 'POST') {
    return handleSendTestEmail(request, env);
  }
  
  // 404 for unknown routes
  return new Response('Not Found', { status: 404 });
}

function handleCORS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    }
  });
}

function getCORSHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function handleHealth() {
  return new Response(
    JSON.stringify({ status: 'ok', message: 'Worker is running' }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...getCORSHeaders()
      }
    }
  );
}

async function handleChoice(path, env) {
  // Parse path: /api/choice/:listId/:pairId/:choice
  // Expected format: /api/choice/:listId/:pairId/:choice
  // After split and filter: ['api', 'choice', 'listId', 'pairId', 'choice']
  const parts = path.split('/').filter(p => p);
  const EXPECTED_PATH_PARTS = 5; // api, choice, listId, pairId, choice
  
  if (parts.length !== EXPECTED_PATH_PARTS) {
    return new Response('Invalid path. Expected format: /api/choice/:listId/:pairId/:choice', { status: 400 });
  }
  
  const listId = parts[2];
  const pairId = parts[3];
  const choice = parts[4];
  
  console.log(`Choice recorded: List ${listId}, Pair ${pairId}, Choice: ${choice}`);
  
  // In production, this would update Firestore
  // For now, just redirect to the frontend
  const frontendUrl = env.FRONTEND_URL || 'https://egga22.github.io/Daily-Pairwise';
  const redirectUrl = `${frontendUrl}?list=${listId}&continue=true`;
  
  return Response.redirect(redirectUrl, 302);
}

async function handleSendTestEmail(request, env) {
  try {
    const body = await request.json();
    const { email, itemA, itemB, listId, pairId } = body;
    
    if (!email || !itemA || !itemB) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, itemA, itemB' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...getCORSHeaders()
          }
        }
      );
    }
    
    await sendPairwiseEmail(
      email,
      itemA,
      itemB,
      listId || 'test',
      pairId || '1',
      env
    );
    
    return new Response(
      JSON.stringify({ success: true, message: 'Test email sent successfully' }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...getCORSHeaders()
        }
      }
    );
  } catch (error) {
    console.error('Error sending test email:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to send email', 
        details: error.message 
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...getCORSHeaders()
        }
      }
    );
  }
}

async function sendPairwiseEmail(toEmail, itemA, itemB, listId, pairId, env) {
  const MAILJET_API_KEY = env.MAILJET_API_KEY;
  const MAILJET_SECRET_KEY = env.MAILJET_SECRET_KEY;
  const SENDER_EMAIL = env.SENDER_EMAIL || 'noreply@daily-pairwise.com';
  const SENDER_NAME = env.SENDER_NAME || 'Daily Pairwise';
  
  if (!MAILJET_API_KEY || !MAILJET_SECRET_KEY) {
    throw new Error('Mailjet API credentials not configured');
  }
  
  // Get the base URL from the request or use the configured frontend URL
  const baseUrl = env.FRONTEND_URL || 'https://egga22.github.io/Daily-Pairwise';
  
  // Construct choice URLs - these will point to the worker's /api/choice endpoint
  // The worker URL should be configured in wrangler.toml as WORKER_URL environment variable
  const workerUrl = env.WORKER_URL;
  
  let choiceUrlA, choiceUrlB;
  if (workerUrl) {
    choiceUrlA = `${workerUrl}/api/choice/${listId}/${pairId}/a`;
    choiceUrlB = `${workerUrl}/api/choice/${listId}/${pairId}/b`;
  } else {
    // Fallback: direct users to the frontend with choice parameter
    // Note: Without WORKER_URL, choices won't be automatically recorded by the worker
    // The frontend would need to handle the choice parameter if implemented
    console.warn('WORKER_URL not configured - email links will redirect to frontend with choice parameter');
    choiceUrlA = `${baseUrl}?list=${listId}&choice=a&continue=true`;
    choiceUrlB = `${baseUrl}?list=${listId}&choice=b&continue=true`;
  }
  
  const htmlContent = generateEmailHTML(itemA, itemB, choiceUrlA, choiceUrlB, baseUrl, listId);
  const textContent = generateEmailText(itemA, itemB, baseUrl, listId);
  
  // Mailjet API v3.1 endpoint
  const mailjetUrl = 'https://api.mailjet.com/v3.1/send';
  
  const auth = btoa(`${MAILJET_API_KEY}:${MAILJET_SECRET_KEY}`);
  
  const mailjetRequest = {
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
        TextPart: textContent
      }
    ]
  };
  
  const response = await fetch(mailjetUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(mailjetRequest)
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Mailjet API error: ${response.status} - ${errorText}`);
  }
  
  return await response.json();
}

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

function generateEmailHTML(itemA, itemB, choiceUrlA, choiceUrlB, frontendUrl, listId) {
  return `
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
}

function generateEmailText(itemA, itemB, frontendUrl, listId) {
  return `Daily Pairwise Ranking

Your daily comparison is ready!

Which item do you prefer?

Option A: ${itemA}

Option B: ${itemB}

Visit ${frontendUrl}?list=${listId} to make your choice and continue ranking.`;
}

async function handleScheduled(event, env, ctx) {
  console.log('Scheduled event triggered at:', new Date(event.scheduledTime).toISOString());
  
  // In production, this would:
  // 1. Query Firestore for lists with dailyMode: true and matching time
  // 2. For each list, get the next unpaired comparison
  // 3. Send email with the comparison
  // 4. Mark the pair as sent
  
  // Example pseudocode:
  // const currentHour = new Date().getUTCHours();
  // const lists = await getDailyModeLists(currentHour);
  // for (const list of lists) {
  //   const nextPair = getNextComparison(list);
  //   if (nextPair) {
  //     await sendPairwiseEmail(
  //       list.userEmail,
  //       nextPair.itemA,
  //       nextPair.itemB,
  //       list.id,
  //       nextPair.id,
  //       env
  //     );
  //   }
  // }
  
  console.log('Scheduled email check completed');
}
