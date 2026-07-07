/**
 * Service IA générique — compatible avec tout endpoint OpenAI-compatible.
 *
 * Endpoints supportés (exemples) :
 *   - https://api.openai.com/v1/chat/completions
 *   - http://localhost:1234/v1/chat/completions (LM Studio)
 *   - https://api.groq.com/openai/v1/chat/completions
 *   - https://openrouter.ai/api/v1/chat/completions
 *
 * Fonctionnalités :
 *   - fetch API natif
 *   - AbortController (annulation)
 *   - Timeout configurable
 *   - Retry automatique sur erreurs réseau
 *   - Streaming SSE (Server-Sent Events)
 *   - Gestion des erreurs détaillée
 *
 * Aucune donnée n'est envoyée ailleurs que vers l'endpoint configuré.
 */

const DEFAULT_TIMEOUT = 60_000       // 60 secondes
const DEFAULT_MAX_RETRIES = 2
const RETRY_DELAY = 800

/* =========================================================
   Construction de l'URL de l'endpoint
   ========================================================= */
function buildEndpointUrl(baseUrl, autoAppend = true) {
  if (!baseUrl) return baseUrl
  
  // Normaliser l'URL (supprimer les slashes finaux)
  let url = baseUrl.replace(/\/+$/, '')
  
  // Ajouter /chat/completions si nécessaire et autoAppend activé
  if (autoAppend && !url.endsWith('/chat/completions')) {
    url = url + '/chat/completions'
  }
  
  return url
}

/* =========================================================
   Validation des paramètres
   ========================================================= */
export function validateSettings(settings) {
  const errors = []

  if (!settings?.apiEndpoint) {
    errors.push("L'URL de l'API est requise.")
  } else {
    try {
      const url = new URL(settings.apiEndpoint)
      if (!url.protocol.startsWith('http')) {
        errors.push("L'URL de l'API doit commencer par http:// ou https://")
      }
    } catch {
      errors.push("L'URL de l'API est invalide.")
    }
  }

  if (!settings?.model?.trim()) {
    errors.push("Le modèle est requis.")
  }

  if (typeof settings.temperature !== 'number' ||
      settings.temperature < 0 || settings.temperature > 2) {
    errors.push("La température doit être comprise entre 0.0 et 2.0.")
  }

  if (settings.maxTokens !== undefined && settings.maxTokens !== null &&
      (typeof settings.maxTokens !== 'number' || settings.maxTokens < 1)) {
    errors.push("Max tokens doit être un entier positif.")
  }

  // La clé API peut être vide pour les endpoints locaux (LM Studio, Ollama)
  // On ne signale une erreur que pour les endpoints distants connus
  if (!settings?.apiKey?.trim()) {
    const host = (() => {
      try { return new URL(settings?.apiEndpoint || '').hostname } catch { return '' }
    })()
    const publicHosts = ['api.openai.com', 'api.groq.com', 'openrouter.ai', 'api.anthropic.com']
    if (publicHosts.some(h => host.includes(h))) {
      errors.push("La clé API est requise pour cet endpoint public.")
    }
  }

  return errors
}

/* =========================================================
   Estimation de tokens (approximation : 1 token ≈ 4 caractères)
   ========================================================= */
export function estimateTokens(text) {
  if (!text) return 0
  return Math.ceil(text.length / 4)
}

export function estimateMessagesTokens(messages = []) {
  return messages.reduce((sum, m) => {
    const content = typeof m?.content === 'string' ? m.content : JSON.stringify(m?.content || '')
    return sum + 4 + estimateTokens(content) // +4 par message (overhead)
  }, 0)
}

/* =========================================================
   Attente
   ========================================================= */
const sleep = (ms) => new Promise(r => setTimeout(r, ms))

/* =========================================================
   Envoi de message — mode non-streaming
   ========================================================= */
async function sendNormal(messages, settings, { signal } = {}) {
  const endpoint = buildEndpointUrl(settings.apiEndpoint, settings.autoAppendChatCompletions)
  
  const body = {
    model: settings.model,
    messages,
    temperature: settings.temperature
  }
  if (settings.maxTokens && settings.maxTokens > 0) {
    body.max_tokens = settings.maxTokens
  }

  const headers = { 'Content-Type': 'application/json' }
  if (settings.apiKey?.trim()) {
    headers['Authorization'] = `Bearer ${settings.apiKey.trim()}`
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), settings.timeout || DEFAULT_TIMEOUT)
  if (signal) signal.addEventListener('abort', () => controller.abort())

  try {
    // Use PHP proxy server to avoid CORS issues
    const proxyUrl = 'http://localhost/MesProjets/educatbot-src/server/proxy.php?action=chat'
    const res = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        endpoint: endpoint,
        apiKey: settings.apiKey,
        body: body
      }),
      signal: controller.signal
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      let errBody
      try { errBody = JSON.parse(errText) } catch { errBody = errText }
      throw createHttpError(res.status, errBody)
    }

    const data = await res.json()
    const content = data?.choices?.[0]?.message?.content
      ?? data?.choices?.[0]?.text
      ?? ''
    return {
      content,
      usage: data?.usage || null,
      finishReason: data?.choices?.[0]?.finish_reason || 'stop'
    }
  } finally {
    clearTimeout(timeoutId)
  }
}

/* =========================================================
   Envoi de message — mode streaming (SSE)
   ========================================================= */
async function sendStream(messages, settings, { signal, onToken } = {}) {
  const endpoint = buildEndpointUrl(settings.apiEndpoint, settings.autoAppendChatCompletions)
  
  const body = {
    model: settings.model,
    messages,
    temperature: settings.temperature,
    stream: true
  }
  if (settings.maxTokens && settings.maxTokens > 0) {
    body.max_tokens = settings.maxTokens
  }

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'text/event-stream'
  }
  if (settings.apiKey?.trim()) {
    headers['Authorization'] = `Bearer ${settings.apiKey.trim()}`
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), settings.timeout || DEFAULT_TIMEOUT)
  if (signal) signal.addEventListener('abort', () => controller.abort())

  let fullContent = ''

  try {
    // Use PHP proxy server to avoid CORS issues
    const proxyUrl = 'http://localhost/MesProjets/educatbot-src/server/proxy.php?action=chat'
    const res = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        endpoint: endpoint,
        apiKey: settings.apiKey,
        body: body
      }),
      signal: controller.signal
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      let errBody
      try { errBody = JSON.parse(errText) } catch { errBody = errText }
      throw createHttpError(res.status, errBody)
    }

    if (!res.body) {
      // Pas de body streamable — fallback
      const data = await res.json()
      const content = data?.choices?.[0]?.message?.content || ''
      if (onToken) onToken(content)
      return { content, usage: data?.usage || null, finishReason: 'stop' }
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      // Découpage par lignes SSE
      const lines = buffer.split('\n')
      buffer = lines.pop() || '' // dernière ligne incomplète

      for (const raw of lines) {
        const line = raw.trim()
        if (!line || !line.startsWith('data:')) continue

        const data = line.slice(5).trim()
        if (data === '[DONE]') {
          return { content: fullContent, usage: null, finishReason: 'stop' }
        }

        try {
          const json = JSON.parse(data)
          const delta = json?.choices?.[0]?.delta?.content
            ?? json?.choices?.[0]?.text
            ?? ''
          if (delta) {
            fullContent += delta
            if (onToken) onToken(delta, fullContent)
          }
          if (json?.choices?.[0]?.finish_reason === 'stop') {
            return { content: fullContent, usage: json?.usage || null, finishReason: 'stop' }
          }
        } catch {
          // Ligne mal formée — on ignore
        }
      }
    }

    return { content: fullContent, usage: null, finishReason: 'stop' }
  } finally {
    clearTimeout(timeoutId)
  }
}

/* =========================================================
   Création d'erreurs HTTP détaillées
   ========================================================= */
function createHttpError(status, body) {
  let message = `Erreur HTTP ${status}`

  if (status === 401) message = 'Clé API invalide ou manquante (401).'
  else if (status === 403) message = "Accès refusé (403). Vérifiez vos droits sur l'API."
  else if (status === 404) message = "Endpoint introuvable (404). Vérifiez l'URL de l'API."
  else if (status === 429) message = 'Trop de requêtes (429). Réessayez dans un instant.'
  else if (status >= 500) message = `Erreur serveur (${status}). Réessayez plus tard.`

  // Message détaillé de l'API
  if (body) {
    const detail = typeof body === 'string' ? body
      : body?.error?.message || body?.message || JSON.stringify(body)
    if (detail) message += ` — ${detail}`
  }

  const err = new Error(message)
  err.status = status
  err.body = body
  err.isRetryable = status === 429 || status >= 500
  return err
}

/* =========================================================
   API publique : sendMessage
   ========================================================= */
/**
 * Envoie une liste de messages à l'API IA.
 *
 * @param {Array<{role: string, content: string}>} messages - Messages au format OpenAI
 * @param {Object} settings - Paramètres IA { apiEndpoint, apiKey, model, temperature, maxTokens, timeout, autoAppendChatCompletions }
 * @param {Object} [options]
 * @param {boolean} [options.stream=true] - Active le streaming
 * @param {AbortSignal} [options.signal] - Signal d'annulation
 * @param {(delta: string, full: string) => void} [options.onToken] - Callback streaming
 * @returns {Promise<{content: string, usage: Object|null, finishReason: string}>}
 */
export async function sendMessage(messages, settings, options = {}) {
  const { stream = true, signal, onToken } = options

  const errors = validateSettings(settings)
  if (errors.length) {
    throw new Error(`Configuration invalide : ${errors.join(' ')}`)
  }

  const maxRetries = settings.maxRetries ?? DEFAULT_MAX_RETRIES
  let lastError

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (stream) {
        return await sendStream(messages, settings, { signal, onToken })
      } else {
        return await sendNormal(messages, settings, { signal })
      }
    } catch (err) {
      lastError = err

      // Annulation explicite — on ne retry pas
      if (signal?.aborted || err.name === 'AbortError') {
        const e = new Error('Génération annulée.')
        e.aborted = true
        throw e
      }

      // Erreurs non récupérables — on ne retry pas
      const isRetryable = err.isRetryable || err.name === 'TypeError' // TypeError = erreur réseau
      if (!isRetryable || attempt === maxRetries) {
        throw err
      }

      // Attente exponentielle avant retry
      await sleep(RETRY_DELAY * Math.pow(2, attempt))
    }
  }

  throw lastError
}

/* =========================================================
   Test de connexion
   ========================================================= */
export async function testConnection(settings) {
  try {
    const result = await sendMessage(
      [{ role: 'user', content: 'Réponds simplement : "OK"' }],
      { ...settings, maxRetries: 0 },
      { stream: false }
    )
    return { ok: true, content: result.content, usage: result.usage }
  } catch (err) {
    return { ok: false, error: err.message || 'Erreur inconnue' }
  }
}