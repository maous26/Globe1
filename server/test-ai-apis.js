require('dotenv').config({ path: __dirname + '/.env' });
const axios = require('axios');

async function testGemini() {
  const endpoint = process.env.GEMINI_API_ENDPOINT;
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!endpoint || !apiKey) {
    console.error('Gemini config missing');
    return;
  }
  try {
    // Ajoute la clé API dans l'URL (paramètre ?key=...)
    const urlWithKey = endpoint.includes('?') ? `${endpoint}&key=${apiKey}` : `${endpoint}?key=${apiKey}`;
    const res = await axios({
      method: 'POST',
      url: urlWithKey,
      headers: {
        'Content-Type': 'application/json'
      },
      data: {
        contents: [{ role: 'user', parts: [{ text: 'Test Gemini API: return {"test":true}' }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 256, topP: 0.95, topK: 40 }
      }
    });
    console.log('Gemini response:', res.data);
  } catch (e) {
    console.error('Gemini error:', e.response?.data || e.message);
  }
}

async function testGPT() {
  const endpoint = process.env.GPT_API_ENDPOINT;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!endpoint || !apiKey) {
    console.error('GPT config missing');
    return;
  }
  try {
    const res = await axios({
      method: 'POST',
      url: endpoint,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      data: {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Test GPT API' },
          { role: 'user', content: 'Test GPT API: return {"test":true}' }
        ],
        temperature: 0.2,
        max_tokens: 256
      }
    });
    console.log('GPT response:', res.data);
  } catch (e) {
    console.error('GPT error:', e.response?.data || e.message);
  }
}

async function testSendGrid() {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'test@globegenius.app';
  const toEmail = process.env.SENDGRID_FROM_EMAIL || 'test@globegenius.app';
  if (!apiKey) {
    console.error('SendGrid API key missing');
    return;
  }
  try {
    const res = await axios({
      method: 'POST',
      url: 'https://api.sendgrid.com/v3/mail/send',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json'
      },
      data: {
        personalizations: [{
          to: [{ email: toEmail }],
          subject: 'Test SendGrid API from GlobeGenius'
        }],
        from: { email: fromEmail },
        content: [{ type: 'text/plain', value: 'This is a test email from GlobeGenius SendGrid API.' }]
      }
    });
    console.log('SendGrid response:', res.status, res.statusText);
  } catch (e) {
    if (e.response) {
      console.error('SendGrid error:', e.response.status, e.response.data);
    } else {
      console.error('SendGrid error:', e.message);
    }
  }
}

async function testFlightLabs() {
  const apiUrl = process.env.FLIGHT_API_URL;
  const apiKey = process.env.FLIGHT_API_KEY;
  if (!apiUrl || !apiKey) {
    console.error('FlightLabs config missing');
    return;
  }
  try {
    // The endpoint already includes the path, so just add the access_key param
    const res = await axios.get(apiUrl, {
      params: {
        access_key: apiKey,
        type: 'departure',
        iataCode: 'CDG',
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      },
      timeout: 10000
    });
    console.log('FlightLabs response:', res.data);
  } catch (e) {
    if (e.response) {
      console.error('FlightLabs error:', e.response.status, e.response.data);
    } else {
      console.error('FlightLabs error:', e.message);
    }
  }
}

(async () => {
  await testGemini();
  await testGPT();
  await testSendGrid();
  await testFlightLabs();
})();