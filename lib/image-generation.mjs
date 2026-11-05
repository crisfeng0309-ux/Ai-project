import { designKnowledgeSummary } from './design-knowledge.mjs';
import { buildImageGenerationRules } from './image-prompt-rules.mjs';

const defaultImageApiUrl = 'https://ark.cn-beijing.volces.com/api/v3/images/generations';
// Leave a small response buffer inside Vercel's 60-second function limit.
const defaultImageTimeoutMs = 55000;

function text(value, fallback = '') {
  if (typeof value === 'string') return value.trim();
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function imageTimeoutMs() {
  const configured = Number(process.env.ARK_IMAGE_TIMEOUT_MS || process.env.DOUBAO_IMAGE_TIMEOUT_MS || defaultImageTimeoutMs);
  return Number.isFinite(configured) && configured > 0 ? Math.min(configured, 55000) : defaultImageTimeoutMs;
}

function readImageUrl(body) {
  const candidates = [
    body?.data?.[0]?.url,
    body?.data?.[0]?.image_url,
    body?.images?.[0]?.url,
    body?.output?.images?.[0]?.url,
    body?.output?.[0]?.url,
    body?.url
  ];
  return candidates.find(value => typeof value === 'string' && value.trim()) || '';
}

function readBase64Image(body) {
  const candidates = [
    body?.data?.[0]?.b64_json,
    body?.data?.[0]?.base64,
    body?.images?.[0]?.b64_json,
    body?.images?.[0]?.base64
  ];
  const value = candidates.find(item => typeof item === 'string' && item.trim());
  return value ? `data:image/png;base64,${value}` : '';
}

function readTaskId(body) {
  return text(body?.id || body?.task_id || body?.taskId || body?.data?.id || body?.output?.task_id);
}

function buildPrompt(input) {
  const scheme = input.scheme || {};
  const product = { ...(input.product || {}) };
  if (product.image) product.image = '[商品图片作为参考图传入]';
  const userFacts = {
    projectName: input.projectName || '',
    product,
    market: input.market || '',
    platform: input.platform || '',
    selectedSellingPoints: input.selectedSellingPoints || [],
    selectedDirections: input.selectedDirections || [],
    selectedAudience: input.selectedAudience || [],
    approvedBrief: input.approvedBrief || input.strategy?.brief || {}
  };
  const knowledge = designKnowledgeSummary(input);
  const imageRules = buildImageGenerationRules(input.market);
  const sections = [
    '生成优先级：用户商品资料和明确要求最高；已确认创意简报决定广告表达；后台设计知识库只提供构图、色彩、光影、排版和展示方式建议，不得覆盖前两者；不得虚构商品功能、参数、品牌或宣传数据。',
    `用户资料与创意要求：${JSON.stringify(userFacts)}`,
    `后台广告设计知识库（仅作辅助，不得改变用户内容）：\n${knowledge}`,
    `最终图片生成约束：\n${imageRules}`,
    text(scheme.imagePrompt || input.prompt),
    text(scheme.adTitle && `广告标题：${scheme.adTitle}`),
    text(scheme.adBody && `广告正文：${scheme.adBody}`),
    text(input.market && `目标市场：${input.market}`),
    text(input.platform && `广告平台：${input.platform}`)
  ].filter(Boolean);
  return sections.join('\n\n');
}

export async function generateDoubaoImage(input = {}) {
  const apiKey = process.env.ARK_API_KEY || process.env.DOUBAO_API_KEY || '';
  const model = process.env.ARK_IMAGE_MODEL || process.env.DOUBAO_IMAGE_MODEL || '';
  const apiUrl = process.env.ARK_IMAGE_API_URL || process.env.DOUBAO_IMAGE_API_URL || defaultImageApiUrl;
  if (!apiKey) throw new Error('IMAGE_API_NOT_CONFIGURED');
  if (!model) throw new Error('IMAGE_MODEL_NOT_CONFIGURED');

  const prompt = buildPrompt(input);
  if (!prompt) throw new Error('IMAGE_PROMPT_REQUIRED');

  const requestBody = {
    model,
    prompt,
    response_format: 'url',
    size: text(input.size, process.env.ARK_IMAGE_SIZE || '1024x1024'),
    watermark: false
  };
  const referenceImage = input.productImage?.dataUrl || input.productImage?.url || '';
  if (referenceImage) requestBody.image = [referenceImage];
  if (input.negativePrompt || input.scheme?.negativePrompt) requestBody.negative_prompt = text(input.negativePrompt || input.scheme.negativePrompt);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), imageTimeoutMs());
  let response;
  let body;
  try {
    response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });
    body = await response.json().catch(() => ({}));
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('IMAGE_API_TIMEOUT');
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
  if (!response.ok) {
    const detail = text(body?.error?.message || body?.message || body?.error, `HTTP ${response.status}`);
    throw new Error(`IMAGE_API_HTTP_${response.status}: ${detail}`);
  }
  const imageUrl = readImageUrl(body) || readBase64Image(body);
  const taskId = readTaskId(body);
  if (!imageUrl && !taskId) throw new Error('IMAGE_API_EMPTY_RESPONSE');
  return { imageUrl, taskId, provider: 'doubao', model, prompt };
}

export function imageGenerationErrorMessage(error) {
  const code = error?.message || '';
  if (code === 'IMAGE_API_NOT_CONFIGURED') return '请先配置豆包 API Key。';
  if (code === 'IMAGE_MODEL_NOT_CONFIGURED') return '请先配置豆包生图模型 Endpoint ID。';
  if (code === 'IMAGE_PROMPT_REQUIRED') return '当前模板没有可用的图片提示词。';
  if (code === 'IMAGE_API_EMPTY_RESPONSE') return '豆包接口没有返回图片地址或任务 ID。';
  if (code === 'IMAGE_API_TIMEOUT') return '豆包生图接口响应超时，请检查模型配置、API Key 和接口地址后重试。';
  return code.startsWith('IMAGE_API_HTTP_') ? `豆包生图接口调用失败：${code}` : '图片生成失败，请检查豆包接口配置。';
}
