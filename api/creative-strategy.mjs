import { handleAI } from '../lib/ai.mjs';

export default function handler(req, res) {
  return handleAI('strategy', req, res);
}
