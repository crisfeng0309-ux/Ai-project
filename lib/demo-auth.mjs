// 演示环境门禁（零依赖）
//
// 设计原则：
//   1. 默认关闭：只要 .env 里没有 DEMO_ACCESS_PASSWORD，整站行为和加门禁之前完全一致；
//   2. 密码只存在服务器（环境变量），不进前端代码、不进仓库；
//   3. token 用 HMAC 签名，改密码后旧 token 自动失效；
//   4. 失败限流，防止有人暴力试密码。

import { createHmac, timingSafeEqual } from 'node:crypto';

const DEFAULT_TTL_HOURS = 168; // 7 天
const DAY_LIMIT_HOURS = 24 * 30;

export function demoAuthConfig(env = process.env) {
  const source = env || {};
  const user = String(source.DEMO_ACCESS_USER || 'judge').trim() || 'judge';
  const password = String(source.DEMO_ACCESS_PASSWORD || '').trim();
  const secret = String(source.DEMO_ACCESS_SECRET || '').trim() || password;
  const configured = Number(source.DEMO_ACCESS_TTL_HOURS || DEFAULT_TTL_HOURS);
  const ttlHours = Number.isFinite(configured) && configured > 0 ? Math.min(configured, DAY_LIMIT_HOURS) : DEFAULT_TTL_HOURS;
  return { enabled: Boolean(password && secret), user, password, secret, ttlHours };
}

function base64url(value) {
  return Buffer.from(value).toString('base64url');
}

function sign(payload, secret) {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left || ''), 'utf8');
  const b = Buffer.from(String(right || ''), 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

// 发一个带过期时间的签名 token；authEnabled 关闭时不签发（返回空 token）
export function issueToken(user, env = process.env) {
  const config = demoAuthConfig(env);
  if (!config.enabled) return { token: '', expiresAt: 0, authEnabled: false };
  const expiresAt = Date.now() + config.ttlHours * 3600 * 1000;
  const payload = base64url(JSON.stringify({ u: user, exp: expiresAt }));
  return { token: `v1.${payload}.${sign(payload, config.secret)}`, expiresAt, authEnabled: true };
}

export function verifyToken(token, env = process.env) {
  const config = demoAuthConfig(env);
  // 没开门禁时一律放行，保证「只添加、不影响」现有使用
  if (!config.enabled) return { ok: true, user: config.user, authEnabled: false };

  const raw = String(token || '').trim();
  if (!raw.startsWith('v1.')) return { ok: false, authEnabled: true };
  const parts = raw.split('.');
  if (parts.length !== 3) return { ok: false, authEnabled: true };

  const [, payload, signature] = parts;
  const expected = sign(payload, config.secret);
  if (!safeEqual(signature, expected)) return { ok: false, authEnabled: true };

  let data = null;
  try {
    data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return { ok: false, authEnabled: true };
  }
  if (!data || typeof data.exp !== 'number' || data.exp <= Date.now()) return { ok: false, authEnabled: true };
  return { ok: true, user: String(data.u || config.user), expiresAt: data.exp, authEnabled: true };
}

export function checkCredentials(user, password, env = process.env) {
  const config = demoAuthConfig(env);
  if (!config.enabled) return true;
  const userOk = safeEqual(String(user || '').trim(), config.user);
  const passwordOk = safeEqual(String(password || ''), config.password);
  // 两项都算完再返回，避免用时间差判断哪一项错了
  return userOk && passwordOk;
}

// 内存限流：同一来源连续失败 max 次后锁 windowMs
export function createRateLimiter({ max = 5, windowMs = 60000 } = {}) {
  const hits = new Map();
  return {
    check(key) {
      const now = Date.now();
      const entry = hits.get(key);
      if (!entry) return { ok: true };
      if (entry.blockedUntil > now) return { ok: false, retryAfterMs: entry.blockedUntil - now };
      if (now - entry.firstAt > windowMs) hits.delete(key);
      return { ok: true };
    },
    fail(key) {
      const now = Date.now();
      const entry = hits.get(key) || { count: 0, firstAt: now, blockedUntil: 0 };
      if (now - entry.firstAt > windowMs) {
        entry.count = 0;
        entry.firstAt = now;
        entry.blockedUntil = 0;
      }
      entry.count += 1;
      if (entry.count >= max) entry.blockedUntil = now + windowMs;
      hits.set(key, entry);
      return entry.count;
    },
    reset(key) {
      hits.delete(key);
    },
    size() {
      return hits.size;
    }
  };
}

export function readToken(req) {
  const header = String(req?.headers?.authorization || '');
  if (header.toLowerCase().startsWith('bearer ')) return header.slice(7).trim();
  return String(req?.headers?.['x-demo-token'] || '').trim();
}

export function clientIp(req) {
  const forwarded = String(req?.headers?.['x-forwarded-for'] || '').split(',')[0].trim();
  if (forwarded) return forwarded;
  const real = String(req?.headers?.['x-real-ip'] || '').trim();
  if (real) return real;
  return String(req?.socket?.remoteAddress || 'unknown');
}

// 给前端用的判定：只暴露「有没有开门禁」，不暴露密码
export function authStatus(env = process.env) {
  const config = demoAuthConfig(env);
  return { authEnabled: config.enabled, user: config.enabled ? config.user : '' };
}
