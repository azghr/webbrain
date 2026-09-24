// fal.ai generative media (assistive model).
//
// Configured in Settings → Assistive Models → "Generative media (fal.ai)" and
// stored in chrome.storage.local under `imageGenModel = { apiKey, model }`.
// Consumed by the `generate_image` agent tool.
//
// fal.ai uses a queue API (not OpenAI chat-completions): submit a prompt to
// https://queue.fal.run/{model-id}, poll status_url, then fetch response_url.
// Auth header format is `Authorization: Key <FAL_KEY>`.

export const IMAGE_GEN_MODEL_KEY = 'imageGenModel';
export const FAL_QUEUE_BASE = 'https://queue.fal.run';
const FAL_STATUS_POLL_INTERVAL_MS = 2000;
const FAL_STATUS_TIMEOUT_MS = 120000;

/**
 * Normalize a fal.ai model id ("fal-ai/flux/schnell"). Rejects path traversal
 * — the id is interpolated into the queue URL.
 */
export function normalizeFalModelId(model) {
  const id = String(model || '').trim().replace(/^\/+|\/+$/g, '');
  if (!id) return '';
  if (!/^[A-Za-z0-9][A-Za-z0-9._\-/]*$/.test(id) || id.includes('..')) return '';
  return id;
}

export function isImageGenConfigured(cfg) {
  return !!(cfg && cfg.apiKey && cfg.model);
}

export function falQueueSubmitUrl(model) {
  return `${FAL_QUEUE_BASE}/${model}`;
}

/**
 * Probe URL used by Test Connection: a request id that cannot exist. A valid
 * key gets 404 (not found); an invalid key gets 401/403. Avoids generating a
 * paid image just to check the key.
 */
export function falQueueProbeUrl(model) {
  return `${FAL_QUEUE_BASE}/${model}/requests/00000000-0000-0000-0000-000000000000/status`;
}

/**
 * Extract a usable media URL from a fal.ai queue response payload. Different
 * model families return different shapes (images[], image, videos[], video,
 * audio, or a plain URL string).
 */
export function extractFalMediaUrl(payload) {
  if (!payload || typeof payload !== 'object') return '';
  if (typeof payload.url === 'string' && /^https:\/\//.test(payload.url)) return payload.url;
  for (const listKey of ['images', 'videos', 'audio']) {
    const list = payload[listKey];
    if (Array.isArray(list) && typeof list[0]?.url === 'string' && /^https:\/\//.test(list[0].url)) {
      return list[0].url;
    }
  }
  for (const objKey of ['image', 'video', 'audio']) {
    const obj = payload[objKey];
    if (obj && typeof obj.url === 'string' && /^https:\/\//.test(obj.url)) return obj.url;
  }
  return '';
}

async function falAuthHeaders(apiKey) {
  return { 'Authorization': `Key ${apiKey}`, 'Content-Type': 'application/json' };
}

/**
 * Run a queued fal.ai generation: submit → poll → fetch result.
 * `fetchImpl` is injectable for tests.
 */
export async function runFalGeneration({ prompt, config, fetchImpl = fetch, timeoutMs = FAL_STATUS_TIMEOUT_MS }) {
  const model = normalizeFalModelId(config?.model);
  if (!model) throw new Error('Invalid fal.ai model id.');
  if (!config?.apiKey) throw new Error('fal.ai API key not configured.');
  const text = String(prompt || '').trim();
  if (!text) throw new Error('prompt is required.');

  const headers = await falAuthHeaders(config.apiKey);
  const submitRes = await fetchImpl(falQueueSubmitUrl(model), {
    method: 'POST',
    headers,
    body: JSON.stringify({ prompt: text }),
  });
  if (!submitRes.ok) {
    let body = '';
    try { body = (await submitRes.text()).slice(0, 300); } catch { /* ignore */ }
    throw new Error(`fal.ai submit failed (HTTP ${submitRes.status}): ${body || submitRes.statusText}`);
  }
  let queued;
  try {
    queued = await submitRes.json();
  } catch (e) {
    throw new Error(`fal.ai submit returned invalid JSON: ${e.message}`);
  }
  const statusUrl = typeof queued?.status_url === 'string' ? queued.status_url : '';
  const responseUrl = typeof queued?.response_url === 'string' ? queued.response_url : '';
  if (!statusUrl || !responseUrl) {
    throw new Error('fal.ai submit response missing status_url/response_url.');
  }

  const deadline = Date.now() + timeoutMs;
  let status = 'IN_QUEUE';
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, FAL_STATUS_POLL_INTERVAL_MS));
    const statusRes = await fetchImpl(statusUrl, { headers });
    if (!statusRes.ok) {
      throw new Error(`fal.ai status check failed (HTTP ${statusRes.status}).`);
    }
    let statusPayload;
    try {
      statusPayload = await statusRes.json();
    } catch (e) {
      throw new Error(`fal.ai status returned invalid JSON: ${e.message}`);
    }
    status = String(statusPayload?.status || '').toUpperCase();
    if (status === 'COMPLETED') {
      const resultRes = await fetchImpl(responseUrl, { headers });
      if (!resultRes.ok) {
        throw new Error(`fal.ai result fetch failed (HTTP ${resultRes.status}).`);
      }
      let payload;
      try {
        payload = await resultRes.json();
      } catch (e) {
        throw new Error(`fal.ai result returned invalid JSON: ${e.message}`);
      }
      const url = extractFalMediaUrl(payload);
      if (!url) throw new Error('fal.ai result contained no media URL.');
      return { url, model, status };
    }
    if (status === 'FAILED' || status === 'ERROR') {
      const errText = typeof statusPayload?.error === 'string' ? statusPayload.error : 'unknown error';
      throw new Error(`fal.ai generation failed: ${errText}`);
    }
  }
  throw new Error('fal.ai generation timed out.');
}

/**
 * Agent tool entry point. Reads the assistive-model config from storage.
 */
export async function generateImage(args, fetchImpl = fetch) {
  let cfg;
  const api = (typeof browser !== 'undefined' && browser?.storage) ? browser
    : (typeof chrome !== 'undefined' ? chrome : null);
  try {
    const stored = await api.storage.local.get([IMAGE_GEN_MODEL_KEY]);
    cfg = stored?.[IMAGE_GEN_MODEL_KEY];
  } catch (e) {
    return { success: false, error: 'Failed to read generative media config: ' + e.message };
  }
  if (!isImageGenConfigured(cfg)) {
    return { success: false, error: 'Generative media is not configured. Set up fal.ai in Settings → Assistive Models.' };
  }
  try {
    const result = await runFalGeneration({ prompt: args?.prompt, config: cfg, fetchImpl });
    return { success: true, url: result.url, model: result.model };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Settings "Test Connection" probe — verifies the key authenticates without
 * generating anything (expects 404 for a nonexistent request id).
 */
export async function testImageGenProvider(fetchImpl = fetch) {
  let cfg;
  const api = (typeof browser !== 'undefined' && browser?.storage) ? browser
    : (typeof chrome !== 'undefined' ? chrome : null);
  try {
    const stored = await api.storage.local.get([IMAGE_GEN_MODEL_KEY]);
    cfg = stored?.[IMAGE_GEN_MODEL_KEY];
  } catch (e) {
    return { ok: false, error: 'Failed to read generative media config: ' + e.message };
  }
  if (!isImageGenConfigured(cfg)) {
    return { ok: false, error: 'Generative media not configured (API Key and Model are required).' };
  }
  const model = normalizeFalModelId(cfg.model);
  if (!model) return { ok: false, error: 'Invalid fal.ai model id.' };
  try {
    const res = await fetchImpl(falQueueProbeUrl(model), { headers: await falAuthHeaders(cfg.apiKey) });
    if (res.status === 401 || res.status === 403) {
      return { ok: false, error: 'fal.ai rejected the API key (HTTP ' + res.status + ').' };
    }
    // fal.ai also answers 405 for a nonexistent request id on some model
    // routes; auth is checked before routing, so 405 still proves the key.
    if (res.status === 404 || res.status === 405 || res.ok || res.status === 422) {
      return { ok: true, model };
    }
    return { ok: false, error: `Unexpected response from fal.ai (HTTP ${res.status}).` };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
