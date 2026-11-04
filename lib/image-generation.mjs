const defaultImageApiUrl = 'https://ark.cn-beijing.volces.com/api/v3/images/generations';

function text(value, fallback = '') {
  if (typeof value === 'string') return value.trim();
  if (value === null || value === undefined) return fallback;
  return String(value);
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
  const sections = [
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

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(requestBody)
  });
  const body = await response.json().catch(() => ({}));
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
  return code.startsWith('IMAGE_API_HTTP_') ? `豆包生图接口调用失败：${code}` : '图片生成失败，请检查豆包接口配置。';
}
