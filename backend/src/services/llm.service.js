import OpenAI from 'openai';
import config from '../config/index.js';

let openaiClient = null;

/**
 * Initialize OpenAI client based on provider configuration
 */
const getClient = () => {
  if (openaiClient) return openaiClient;

  const { llm } = config;

  if (!llm.apiKey) {
    throw new Error('LLM API key not configured');
  }

  if (llm.provider === 'azure') {
    openaiClient = new OpenAI({
      apiKey: llm.apiKey,
      baseURL: `${llm.azureEndpoint}/openai/deployments/${llm.azureDeployment}`,
      defaultQuery: { 'api-version': llm.azureApiVersion },
      defaultHeaders: { 'api-key': llm.apiKey },
    });
  } else {
    // Default to OpenAI
    openaiClient = new OpenAI({
      apiKey: llm.apiKey,
    });
  }

  return openaiClient;
};

/**
 * Check LLM service status
 */
export const checkLLMStatus = async () => {
  const { llm } = config;

  return {
    configured: !!llm.apiKey,
    provider: llm.provider,
    model: llm.model,
  };
};

/**
 * Generate a completion from the LLM
 * @param {string} prompt - The prompt to send to the LLM
 * @param {Object} options - Optional parameters
 * @returns {Promise<Object>} The completion result
 */
export const generateCompletion = async (prompt, options = {}) => {
  const client = getClient();
  const { llm } = config;

  const messages = [
    {
      role: 'system',
      content:
        options.systemPrompt || 'You are a helpful assistant for case review and analysis.',
    },
    {
      role: 'user',
      content: prompt,
    },
  ];

  const response = await client.chat.completions.create({
    model: options.model || llm.model,
    messages,
    max_tokens: options.maxTokens || llm.maxTokens,
    temperature: options.temperature ?? llm.temperature,
  });

  return {
    content: response.choices[0]?.message?.content || '',
    usage: response.usage,
    model: response.model,
    finishReason: response.choices[0]?.finish_reason,
  };
};

/**
 * Generate a streaming completion from the LLM
 * @param {string} prompt - The prompt to send to the LLM
 * @param {Object} options - Optional parameters
 * @returns {AsyncIterable} Stream of completion chunks
 */
export const generateStreamingCompletion = async function* (prompt, options = {}) {
  const client = getClient();
  const { llm } = config;

  const messages = [
    {
      role: 'system',
      content:
        options.systemPrompt || 'You are a helpful assistant for case review and analysis.',
    },
    {
      role: 'user',
      content: prompt,
    },
  ];

  const stream = await client.chat.completions.create({
    model: options.model || llm.model,
    messages,
    max_tokens: options.maxTokens || llm.maxTokens,
    temperature: options.temperature ?? llm.temperature,
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      yield content;
    }
  }
};

