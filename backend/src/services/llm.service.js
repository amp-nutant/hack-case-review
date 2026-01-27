import axios from 'axios';

const { LLM_API_URL, LLM_API_KEY, LLM_API_MODEL } = process.env;

export const invokeLLMAPI = async ({ systemPrompt, userPrompt, maxTokens, temperature }) => {

  const data = {
    model: LLM_API_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: maxTokens,
    temperature: temperature,
  };

  const response = await axios.post(LLM_API_URL, data, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${LLM_API_KEY}`,
    },
  });

  const { choices = [] } = response.data;
  const [{ message: { text, content } }] = choices;

  return {
    text,
    content,
  };
};

