import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleAI } from './lib/ai.mjs';
import { generateDoubaoImage, startDoubaoImageTask, getDoubaoImageTaskStatus, imageGenerationErrorMessage } from './lib/image-generation.mjs';
import { demoAuthConfig, issueToken, verifyToken, checkCredentials, createRateLimiter, readToken, clientIp, authStatus } from './lib/demo-auth.mjs';

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

// 这两个接口不校验登录态：一个用来登录，一个用来判断要不要显示登录页
const publicApiRoutes = new Set(['/api/login', '/api/session']);
const apiRoutes = new Set([...Object.keys(aiKinds), ...Object.keys(imageHandlers), '/api/generate-image-status', ...publicApiRoutes]);

// 同一个来源连续输错 5 次，锁 60 秒
const loginLimiter = createRateLimiter({ max: 5, windowMs: 60000 });

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

  // 登录：门禁没开就直接告诉前端「不需要登录」，前端会跳过登录页
  if (path === '/api/login') {
    const config = demoAuthConfig();
    if (!config.enabled) return json(res, 200, { ok: true, data: { authEnabled: false, token: "" } });
    const key = clientIp(req);
    const gate = loginLimiter.check(key);
    if (!gate.ok) {
      return json(res, 429, { ok: false, code: 'AUTH_TOO_MANY', message: `尝试次数过多，请 ${Math.ceil(gate.retryAfterMs / 1000)} 秒后再试` });
    }
    if (!checkCredentials(body.user, body.password)) {
      loginLimiter.fail(key);
      console.warn(`[adlab] 演示登录失败 ip=${key}`);
      return json(res, 401, { ok: false, code: 'AUTH_INVALID', message: '账号或密码不正确' });
    }
    loginLimiter.reset(key);
    const issued = issueToken(config.user);
    console.log(`[adlab] 演示登录成功 ip=${key}`);
    return json(res, 200, { ok: true, data: { authEnabled: true, token: issued.token, expiresAt: issued.expiresAt } });
  }

  // 会话：前端启动时问一次，决定要不要显示登录页
  if (path === '/api/session') {
    const status = authStatus();
    if (!status.authEnabled) return json(res, 200, { ok: true, data: { authEnabled: false } });
    const session = verifyToken(readToken(req));
    if (!session.ok) return json(res, 401, { ok: false, code: 'AUTH_REQUIRED', message: '演示环境需要先登录' });
    return json(res, 200, { ok: true, data: { authEnabled: true, user: session.user, expiresAt: session.expiresAt } });
  }

  if (path === '/api/generate-image-status') {
    try {
      json(res, 200, { ok: true, data: await getDoubaoImageTaskStatus(body.taskId) });
    } catch (error) {
      console.error(`[adlab] 生图状态查询失败 code=${error.message}`);
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
      // 以前图片错误是静默返回的，线上只能看到「请检查豆包接口配置」这种兜底文案，没法定位
      console.error(`[adlab] 生图失败 path=${path} code=${error?.message || error}`);
      if (error?.stack) console.error(error.stack.split('\n').slice(0, 4).join('\n'));
      json(res, imageErrorStatus(error), { ok: false, code: error.message, message: imageGenerationErrorMessage(error) });
    }
    return;
  }

  return handleAI(aiKinds[path], { method: req.method, body }, vercelRes(res));
}

// 允许公开访问的静态路径白名单。任何以点开头的文件（.env / .git / .vercel…）.
// 以及源码、配置文件，一律不对外提供。
const PUBLIC_STATIC = [
  /^\/$/,
  /^\/index\.html$/,
  /^\/favicon\.ico$/,
  /^\/assets\/[A-Za-z0-9._-]+\.(png|jpe?g|svg|webp|gif|ico)$/,
  /^\/lib\/[A-Za-z0-9._-]+\.mjs$/,
  /^\/tools\/[A-Za-z0-9._-]+\.html$/
];

function isPublicStatic(pathname) {
  if (!pathname) return false;
  if (pathname.includes('..')) return false;
  // 兜底：任何隐藏文件/目录（.env、.git、.vercel、.gitignore…）直接拒绝
  if (/\/(\.|[^/]*\/\.)/.test(pathname)) return false;
  return PUBLIC_STATIC.some(pattern => pattern.test(pathname));
}
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml' };

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (url.pathname.startsWith('/api/')) {
      if (req.method !== 'POST' || !apiRoutes.has(url.pathname)) return json(res, 404, { ok: false, message: 'Not found' });
      // 没开门禁时这一段整体跳过，行为和以前完全一致
      if (demoAuthConfig().enabled && !publicApiRoutes.has(url.pathname)) {
        const session = verifyToken(readToken(req));
        if (!session.ok) return json(res, 401, { ok: false, code: 'AUTH_REQUIRED', message: '演示环境需要登录后才能使用' });
      }
      return await handleApi(req, res, url.pathname);
    }
    const requested = url.pathname === '/' ? '/index.html' : url.pathname;
    // 静态文件必须走白名单：以前是「仓库根目录整目录静态服务」，
    // 结果 /.env 和 /.git/HEAD 都能被直接下载（线上日志里有人 GET /.env 拿到 200）。
    // 现在只允许真正需要给浏览器的那几个路径，其余一律 404。
    if (!isPublicStatic(requested)) return json(res, 404, { ok: false, message: 'Not found' });
    const filePath = normalize(join(root, requested));
    if (!filePath.startsWith(root)) return json(res, 403, { ok: false, message: 'Forbidden' });
    const file = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': mime[extname(filePath)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(file);
  } catch { json(res, 404, { ok: false, message: 'Not found' }); }
});

// 必须只监听本机回环：默认 listen(port) 会绑到 0.0.0.0，
// 任何知道 IP 的人都能绕过 nginx 直连 4173（没有访问日志、没有限流）。
const host = process.env.HOST || '127.0.0.1';
server.listen(port, host, () => console.log(`AdLab server running at http://${host}:${port}`));
