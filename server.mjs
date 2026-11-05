import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleAI } from './lib/ai.mjs';
import { generateDoubaoImage, startDoubaoImageTask, getDoubaoImageTaskStatus, imageGenerationErrorMessage } from './lib/image-generation.mjs';

const root = fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.env.PORT || 4173);

// 本地服务复用 lib/ 与 api/ 同一份业务实现，避免与线上行为分叉。
const aiKinds = {
  '/api/product-understanding': 'product',
  '/api/creative-strategy': 'strategy',
  '/api/ad-assets': 'assets',
  '/api/data-analysis': 'dataAnalysis',
  '/api/prompt-translations': 'promptTranslations'
};

const imageHandlers = {
  '/api/generate-image': generateDoubaoImage,
  '/api/generate-image-task': startDoubaoImageTask
};

const apiRoutes = new Set([...Object.keys(aiKinds), ...Object.keys(imageHandlers), '/api/generate-image-status']);

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  let text = '';
  for await (const chunk of req) text += chunk;
  return text ? JSON.parse(text) : {};
}

// lib/ai.mjs 的 handleAI 按 Vercel 函数签名编写（req.body / res.status().json()），
// 这里补一层适配，让同一个实现也能跑在原生 http 服务上。
function vercelRes(res) {
  let statusCode = 200;
  const shim = {
    status(code) { statusCode = code; return shim; },
    json(body) { json(res, statusCode, body); return shim; },
    setHeader(...args) { res.setHeader(...args); return shim; },
    end(body) { res.end(body); return shim; }
  };
  return shim;
}

function imageErrorStatus(error) {
  if (['IMAGE_API_NOT_CONFIGURED', 'IMAGE_MODEL_NOT_CONFIGURED'].includes(error.message)) return 503;
  if (error.message === 'IMAGE_API_TIMEOUT') return 504;
  return 502;
}

async function handleApi(req, res, path) {
  const body = await readBody(req);

  if (path === '/api/generate-image-status') {
    try {
      json(res, 200, { ok: true, data: await getDoubaoImageTaskStatus(body.taskId) });
    } catch (error) {
      const status = error.message === 'IMAGE_TASK_ID_REQUIRED' ? 400 : error.message === 'IMAGE_API_TIMEOUT' ? 504 : 502;
      json(res, status, { ok: false, code: error.message, message: imageGenerationErrorMessage(error) });
    }
    return;
  }

  const imageHandler = imageHandlers[path];
  if (imageHandler) {
    try {
      json(res, 200, { ok: true, data: await imageHandler(body) });
    } catch (error) {
      json(res, imageErrorStatus(error), { ok: false, code: error.message, message: imageGenerationErrorMessage(error) });
    }
    return;
  }

  return handleAI(aiKinds[path], { method: req.method, body }, vercelRes(res));
}

const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8' };

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (url.pathname.startsWith('/api/')) {
      if (req.method !== 'POST' || !apiRoutes.has(url.pathname)) return json(res, 404, { ok: false, message: 'Not found' });
      return await handleApi(req, res, url.pathname);
    }
    const requested = url.pathname === '/' ? '/index.html' : url.pathname;
    const filePath = normalize(join(root, requested));
    if (!filePath.startsWith(root)) return json(res, 403, { ok: false, message: 'Forbidden' });
    const file = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': mime[extname(filePath)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(file);
  } catch { json(res, 404, { ok: false, message: 'Not found' }); }
});

server.listen(port, () => console.log(`AdLab server running at http://localhost:${port}`));
