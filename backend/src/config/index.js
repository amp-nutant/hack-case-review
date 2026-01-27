import dotenv from 'dotenv';

dotenv.config();

const config = {
  // Server
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // CORS
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',

  // MongoDB
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/case-review',

  // LLM Configuration
  llm: {
    provider: process.env.LLM_PROVIDER || 'openai', // openai, azure, anthropic
    apiKey: process.env.LLM_API_KEY || '',
    model: process.env.LLM_MODEL || 'gpt-4',
    maxTokens: parseInt(process.env.LLM_MAX_TOKENS, 10) || 4096,
    temperature: parseFloat(process.env.LLM_TEMPERATURE) || 0.7,

    // Azure specific
    azureEndpoint: process.env.AZURE_OPENAI_ENDPOINT || '',
    azureDeployment: process.env.AZURE_OPENAI_DEPLOYMENT || '',
    azureApiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview',
  },
};

export default config;

