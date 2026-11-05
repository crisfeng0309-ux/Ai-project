import { getDoubaoImageTaskStatus, imageGenerationErrorMessage } from '../lib/image-generation.mjs';

export const runtime = 'nodejs';
export const maxDuration = 30;

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ ok: false, message: 'Method not allowed' }); return; }
  try {
    const input = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    res.status(200).json({ ok: true, data: await getDoubaoImageTaskStatus(input.taskId) });
  } catch (error) {
    const status = error.message === 'IMAGE_TASK_ID_REQUIRED' ? 400 : error.message === 'IMAGE_API_TIMEOUT' ? 504 : 502;
    res.status(status).json({ ok: false, code: error.message, message: imageGenerationErrorMessage(error) });
  }
}
