// server/services/ai/aiService.js
const axios = require('axios');
const { incrementApiCallStats } = require('../analytics/statsService');
const ApiStats = require('../../models/apiStats.model');

// AI service endpoints - Load dynamically to ensure env vars are available
const getGeminiEndpoint = () => process.env.GEMINI_API_ENDPOINT;
const getGeminiApiKey = () => process.env.GOOGLE_AI_API_KEY;
const getGptEndpoint = () => process.env.GPT_API_ENDPOINT;
const getGptApiKey = () => process.env.OPENAI_API_KEY;

/**
 * Gemini Flash API for complex tasks like route optimization
 * @param {string} prompt - Prompt for Gemini AI
 * @param {Object} data - Data to include in prompt
 * @returns {Promise<Object>} - AI response
 */
exports.callGeminiFlash = async (prompt, data = {}) => {
  try {
    // Track API call
    await incrementApiCallStats('ai', 'gemini-flash');
    
    // Prepare prompt with data
    const formattedPrompt = formatPromptWithData(prompt, data);
    
    // Get API configuration
    const endpoint = getGeminiEndpoint();
    const apiKey = getGeminiApiKey();
    
    if (!endpoint || !apiKey) {
      throw new Error('Gemini API configuration missing');
    }
    
    // Call Gemini API with key in URL
    const urlWithKey = endpoint.includes('?') ? `${endpoint}&key=${apiKey}` : `${endpoint}?key=${apiKey}`;
    const response = await axios({
      method: 'POST',
      url: urlWithKey,
      headers: {
        'Content-Type': 'application/json'
      },
      data: {
        contents: [
          {
            role: 'user',
            parts: [{ text: formattedPrompt }]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 8192,
          topP: 0.95,
          topK: 40
        }
      }
    });
    
    // Extract response text
    const responseText = response.data.candidates[0].content.parts[0].text;
    
    // Try to parse JSON from response if expected
    try {
      if (responseText.includes('{') && responseText.includes('}')) {
        const jsonStartIndex = responseText.indexOf('{');
        const jsonEndIndex = responseText.lastIndexOf('}') + 1;
        const jsonString = responseText.substring(jsonStartIndex, jsonEndIndex);
        return JSON.parse(jsonString);
      }
    } catch (jsonError) {
      console.error('Error parsing JSON from Gemini response:', jsonError);
    }
    
    return { text: responseText };
  } catch (error) {
    console.error('Error calling Gemini Flash API:', error);
    // If the API call fails, return a default empty response
    return { text: '', error: error.message };
  }
};

/**
 * GPT-4o Mini API for quick validations and simpler tasks
 * @param {string} prompt - Prompt for GPT AI
 * @param {Object} data - Data to include in prompt
 * @returns {Promise<Object>} - AI response
 */
exports.callGPT4oMini = async (prompt, data = {}) => {
  try {
    // Track API call
    await incrementApiCallStats('ai', 'gpt4o-mini');
    
    // Prepare prompt with data
    const formattedPrompt = formatPromptWithData(prompt, data);
    
    // Get API configuration
    const endpoint = getGptEndpoint();
    const apiKey = getGptApiKey();
    
    if (!endpoint || !apiKey) {
      throw new Error('GPT API configuration missing');
    }
    
    // Call GPT API
    const response = await axios({
      method: 'POST',
      url: endpoint,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      data: {
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful AI assistant specialized in flight deals and travel industry analysis.'
          },
          {
            role: 'user',
            content: formattedPrompt
          }
        ],
        temperature: 0.2,
        max_tokens: 1024
      }
    });
    
    // Extract response text
    const responseText = response.data.choices[0].message.content;
    
    // Try to parse JSON from response if expected
    try {
      if (responseText.includes('{') && responseText.includes('}')) {
        const jsonStartIndex = responseText.indexOf('{');
        const jsonEndIndex = responseText.lastIndexOf('}') + 1;
        const jsonString = responseText.substring(jsonStartIndex, jsonEndIndex);
        return JSON.parse(jsonString);
      }
    } catch (jsonError) {
      console.error('Error parsing JSON from GPT response:', jsonError);
    }
    
    return { text: responseText };
  } catch (error) {
    console.error('Error calling GPT-4o Mini API:', error);
    // If the API call fails, return a default empty response
    return { text: '', error: error.message };
  }
};

/**
 * Smart router for AI tasks - chooses the right model based on task complexity
 * @param {string} task - Task type (e.g., 'route-optimization', 'deal-validation')
 * @param {string} prompt - Prompt for AI
 * @param {Object} data - Data to include in prompt
 * @returns {Promise<Object>} - AI response
 */
exports.routeAIRequest = async (task, prompt, data = {}) => {
  // Define task complexity and route to appropriate model
  const complexTasks = ['route-optimization', 'content-generation', 'market-analysis'];
  const simpleTasks = ['deal-validation', 'quick-check', 'data-categorization'];
  
  if (complexTasks.includes(task)) {
    console.log(`Routing complex task "${task}" to Gemini Flash`);
    try {
      const result = await exports.callGeminiFlash(prompt, data);
      if (result.success) {
        return result;
      }
      throw new Error('Gemini returned unsuccessful result');
    } catch (error) {
      console.log(`Gemini failed for "${task}", falling back to GPT-4o Mini...`);
      return exports.callGPT4oMini(prompt, data);
    }
  } else if (simpleTasks.includes(task)) {
    console.log(`Routing simple task "${task}" to GPT-4o Mini`);
    return exports.callGPT4oMini(prompt, data);
  } else {
    // Default to GPT-4o Mini for undefined tasks
    console.log(`Routing undefined task "${task}" to GPT-4o Mini`);
    return exports.callGPT4oMini(prompt, data);
  }
};

/**
 * Format a prompt with provided data
 * @param {string} prompt - Base prompt template
 * @param {Object} data - Data to include in prompt
 * @returns {string} - Formatted prompt
 */
function formatPromptWithData(prompt, data) {
  let formattedPrompt = prompt;
  
  // Replace data placeholders in prompt
  if (data && Object.keys(data).length > 0) {
    // For simple key-value replacements
    for (const [key, value] of Object.entries(data)) {
      if (typeof value !== 'object') {
        const placeholder = `{{${key}}}`;
        formattedPrompt = formattedPrompt.replace(new RegExp(placeholder, 'g'), value);
      }
    }
    
    // For JSON data that should be inserted as a block
    if (data.jsonData) {
      formattedPrompt = formattedPrompt.replace('{{jsonData}}', JSON.stringify(data.jsonData, null, 2));
    }
  }
  
  return formattedPrompt;
}

/**
 * Check AI quota and usage
 * @returns {Promise<Object>} - AI quota information
 */
exports.checkAIQuota = async () => {
  try {
    // Get today's stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const stats = await ApiStats.findOne({ date: today });
    
    if (!stats) {
      return {
        quotas: {
          'gemini-flash': {
            total: 1000,
            used: 0,
            remaining: 1000
          },
          'gpt4o-mini': {
            total: 2000,
            used: 0,
            remaining: 2000
          }
        }
      };
    }
    
    // Calculate remaining quota
    const aiQuota = {
      'gemini-flash': {
        total: 1000, // Monthly limit
        used: stats.aiCallsByType['gemini-flash'] || 0,
        remaining: 1000 - (stats.aiCallsByType['gemini-flash'] || 0)
      },
      'gpt4o-mini': {
        total: 2000, // Monthly limit
        used: stats.aiCallsByType['gpt4o-mini'] || 0,
        remaining: 2000 - (stats.aiCallsByType['gpt4o-mini'] || 0)
      }
    };
    
    return { quotas: aiQuota };
  } catch (error) {
    console.error('Error checking AI quota:', error);
    return {
      quotas: {
        'gemini-flash': { total: 1000, used: 0, remaining: 1000 },
        'gpt4o-mini': { total: 2000, used: 0, remaining: 2000 }
      },
      error: error.message
    };
  }
};