import { spawn } from 'node:child_process'

type Env = Record<string, string | undefined>
type TextPayload = {
  instructions: string
  input: { role: string; content: { type: string; text?: string; image_url?: string }[] }[]
  text?: { format: { schema: object } }
}

export function connectionStatus(env: Env) {
  const claude = env.FOLIO_TEXT_PROVIDER === 'claude' && !!env.FOLIO_CLAUDE_CLI
  return {
    configured: claude || !!env.OPENAI_API_KEY,
    images: !!env.OPENAI_API_KEY,
    provider: claude ? 'Claude' : env.OPENAI_API_KEY ? 'OpenAI' : null,
  }
}

/** One text-only transport for artifacts, backgrounds and conversation. Never exposes credentials. */
export async function generateText(env: Env, payload: TextPayload, signal: AbortSignal): Promise<string> {
  if (env.FOLIO_TEXT_PROVIDER === 'claude') return claudeText(env, payload, signal)
  if (!env.OPENAI_API_KEY) throw new Error('No model connected. Configure the local server first.')
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: env.FOLIO_TEXT_MODEL || 'gpt-6-astra', store: false, ...payload }),
    signal,
  })
  if (!response.ok)
    throw new Error(
      response.status === 401
        ? 'OpenAI rejected this API key. Replace it in AI settings and try again.'
        : response.status === 429
          ? 'The model has reached its limit. Try again shortly.'
          : `The model could not finish (${response.status}). Check the server connection.`,
    )
  const result = (await response.json()) as {
    status?: string
    output?: { content?: { type: string; text?: string }[] }[]
  }
  const content = result.output?.flatMap((o) => o.content || []) || []
  if (result.status === 'incomplete' || content.some((o) => o.type === 'refusal'))
    throw new Error('The model did not return a complete result. Your previous version is unchanged.')
  const text = content
    .filter((o) => o.type === 'output_text')
    .map((o) => o.text || '')
    .join('')
  if (!text.trim()) throw new Error('The model returned no text. Please retry.')
  return text
}

export function claudeArgs(payload: TextPayload, model: string) {
  return [
    '--print',
    '--safe-mode',
    '--tools',
    '',
    '--strict-mcp-config',
    '--mcp-config',
    '{"mcpServers":{}}',
    '--no-chrome',
    '--no-session-persistence',
    '--permission-mode',
    'dontAsk',
    '--output-format',
    'json',
    '--model',
    model,
    '--effort',
    'medium',
    '--system-prompt',
    payload.instructions,
    ...(payload.text ? ['--json-schema', JSON.stringify(payload.text.format.schema)] : []),
  ]
}

async function claudeText(env: Env, payload: TextPayload, signal: AbortSignal): Promise<string> {
  if (!env.FOLIO_CLAUDE_CLI) throw new Error('Set FOLIO_CLAUDE_CLI to your local Claude executable.')
  if (payload.input.some((m) => m.content.some((c) => c.type === 'input_image')))
    throw new Error(
      'This local Claude connection supports text and CSV, not image references. Use an OpenAI connection for images.',
    )
  const input = JSON.stringify(payload.input)
  if (Buffer.byteLength(input) > 1_000_000)
    throw new Error('This edit exceeds the local model context limit. Use a smaller data extract.')
  signal.throwIfAborted()
  const childEnv = { ...process.env }
  // Reuse the subscription path, never silently switch it to API-key billing.
  delete childEnv.ANTHROPIC_API_KEY
  delete childEnv.ANTHROPIC_AUTH_TOKEN
  return new Promise((resolve, reject) => {
    const child = spawn(env.FOLIO_CLAUDE_CLI!, claudeArgs(payload, env.FOLIO_CLAUDE_MODEL || 'opus'), {
      env: childEnv,
      stdio: ['pipe', 'pipe', 'ignore'],
      signal,
      killSignal: 'SIGTERM',
    })
    let output = ''
    let oversized = false
    child.stdout.setEncoding('utf8')
    child.stdout.on('data', (part: string) => {
      output += part
      if (output.length > 2_000_000) {
        oversized = true
        child.kill()
      }
    })
    child.stdin.on('error', () => {})
    child.on('error', () =>
      reject(new Error('Could not start the local Claude connection. Check its path and sign-in.')),
    )
    child.on('close', (code) => {
      if (signal.aborted)
        return reject(new Error('Generation cancelled. Your previous version is unchanged.'))
      if (oversized) return reject(new Error('The model output was too large. Try a smaller edit.'))
      try {
        const result = JSON.parse(output)
        if (code !== 0 || result.is_error)
          throw new Error('Claude could not finish. Check its sign-in or usage limit, then retry.')
        const text = payload.text ? JSON.stringify(result.structured_output) : result.result
        if (typeof text !== 'string' || !text.trim())
          throw new Error('Claude returned an incomplete result. Please retry.')
        resolve(text)
      } catch (error) {
        reject(
          error instanceof SyntaxError
            ? new Error('Claude returned an unreadable result. Please retry.')
            : error,
        )
      }
    })
    child.stdin.end(input)
  })
}
