import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const backendDirectory = path.dirname(fileURLToPath(import.meta.url));
export const implementationDirectory = path.resolve(backendDirectory, '../..');
const repositoryEnvPath = path.resolve(implementationDirectory, '../../../../.env');

dotenv.config({ path: repositoryEnvPath });

const trimTrailingSlashes = (value = '') => value.trim().replace(/\/+$/, '');

export const config = Object.freeze({
  jiraBaseUrl: trimTrailingSlashes(process.env.JIRA_BASE_URL),
  jiraEmail: process.env.JIRA_EMAIL?.trim() || '',
  jiraToken: process.env.JIRA_TOKEN?.trim() || '',
  groqApiKey: process.env.GROQ_API_KEY?.trim() || '',
  groqModel: process.env.GROQ_MODEL?.trim() || 'openai/gpt-oss-120b',
  ollamaBaseUrl: trimTrailingSlashes(process.env.OLLAMA_BASE_URL),
  apiPort: Number(process.env.API_PORT || process.env.PORT || 3101)
});
