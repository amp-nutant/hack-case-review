import axios from 'axios';

const { LLM_API_URL, LLM_API_KEY, LLM_API_TOKEN, LLM_API_MODEL } = process.env;

// Use TOKEN if KEY is not set (for custom endpoints with Bearer token)
const getAuthHeader = () => {
  const token = LLM_API_KEY || LLM_API_TOKEN;
  return token ? `Bearer ${token}` : '';
};

export const invokeLLMAPI = async ({ systemPrompt, userPrompt, maxTokens = 4096, temperature = 0.7 }) => {
  if (!LLM_API_URL) {
    throw new Error('LLM_API_URL is not configured');
  }

  const data = {
    model: LLM_API_MODEL || 'gpt-4',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: maxTokens,
    temperature: temperature,
  };

  try {
    const response = await axios.post(LLM_API_URL, data, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': getAuthHeader(),
      },
      timeout: 120000, // 2 minute timeout for long analyses
    });

    const { choices = [] } = response.data;
    
    if (choices.length === 0) {
      throw new Error('No response from LLM');
    }

    const { message } = choices[0];
    
    return {
      text: message?.text || message?.content,
      content: message?.content || message?.text,
      usage: response.data.usage,
    };
  } catch (error) {
    if (error.response) {
      console.error('LLM API Error:', error.response.status, error.response.data);
      throw new Error(`LLM API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }
};

