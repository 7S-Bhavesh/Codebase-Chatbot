import { setTimeout as delay } from 'node:timers/promises';

const TRANSIENT_STATUS = new Set([429, 500, 502, 503, 504]);

export function providerFailure(error) {
  let detail = {};
  try { detail = JSON.parse(error.message)?.error || {}; } catch { /* Non-JSON network errors. */ }
  const status = Number(error.status ?? error.code ?? detail.code);
  const retryInfo = detail.details?.find(item => item['@type']?.endsWith('google.rpc.RetryInfo'));
  const retryAfterSeconds = Number.parseFloat(retryInfo?.retryDelay) || 0;
  const quotaInfo = detail.details?.find(item => item['@type']?.endsWith('google.rpc.QuotaFailure'));
  const dailyQuota = quotaInfo?.violations?.some(item => /PerDay/i.test(item.quotaId)) || false;
  return { status, retryAfterSeconds, dailyQuota };
}

export async function generateWithRetry(ai, request, { attempts = 3, sleep = delay, onRetry = async () => {} } = {}) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const response = await ai.models.generateContent({
        ...request,
        config: { ...request.config, httpOptions: { ...request.config?.httpOptions, timeout: 30000 } },
      });
      if (!response.text?.trim()) throw new Error('The model returned an empty response');
      return response;
    } catch (error) {
      const { status, retryAfterSeconds, dailyQuota } = providerFailure(error);
      if (!TRANSIENT_STATUS.has(status) || attempt === attempts - 1) throw error;
      if (dailyQuota || retryAfterSeconds > 10) throw error;
      console.warn(`[generation] HTTP ${status}; retry ${attempt + 1}/${attempts - 1}`);
      await onRetry({ attempt: attempt + 2, status });
      await sleep(Math.max(1000 * 2 ** attempt, retryAfterSeconds * 1000));
    }
  }
}

export function generationErrorMessage(error) {
  const { status, dailyQuota, retryAfterSeconds } = providerFailure(error);
  if (status === 503 || status === 502 || status === 504) {
    return 'The AI service is temporarily unavailable after several attempts. Please try again shortly.';
  }
  if (status === 429 && (dailyQuota || retryAfterSeconds > 3600)) {
    const wait = retryAfterSeconds ? ` Retry in about ${Math.ceil(retryAfterSeconds / 3600)} hours, or check your Gemini API quota.` : ' Check your Gemini API quota before retrying.';
    return `The AI provider's daily request quota is exhausted.${wait}`;
  }
  if (status === 429) return 'The AI service rate limit or quota was reached. Please try again later or check your API quota.';
  return 'Could not generate an answer. Please try again.';
}
