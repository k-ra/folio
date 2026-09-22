import type { IncomingMessage, ServerResponse } from 'node:http'
import { HttpError, jsonResponse, readBody, type Env } from './http.js'
import { generateText, generateTextResult } from './textModel.js'
import { chatPolicy } from './chatPolicy.js'

/** Shared handler for local development and Vercel; credentials stay request-scoped. */
export function createChatHandler(env: Env) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    const json = (status: number, body: unknown) => jsonResponse(res, status, body)
    if (req.method !== 'POST' || req.url !== '/') return json(404, { error: 'Not found' })
    if (
      req.headers.origin !== `http://${req.headers.host}` &&
      req.headers.origin !== `https://${req.headers.host}`
    )
      return json(403, { error: 'Use the Folio editor to chat.' })
    const abort = new AbortController()
    const timeout = setTimeout(() => abort.abort(), 180000)
    res.on('close', () => {
      if (!res.writableEnded) abort.abort()
    })
    try {
      const body = await readBody(req, 1_000_000)
      let request
      try {
        request = JSON.parse(body)
      } catch {
        return json(400, { error: 'Invalid conversation.' })
      }
      if (
        !request ||
        typeof request.instruction !== 'string' ||
        !request.instruction.trim() ||
        request.instruction.length > 12000 ||
        !Array.isArray(request.history) ||
        !request.story
      )
        return json(400, { error: 'Invalid conversation.' })
      let policy
      try {
        policy = chatPolicy(request.settings, env.FOLIO_TEXT_PROVIDER)
      } catch (error) {
        return json(400, {
          error:
            error instanceof Error && !('issues' in error)
              ? error.message
              : 'Invalid chat settings. Keep the system prompt within 6,000 characters.',
        })
      }
      const research = policy.research
        ? await generateTextResult(env, policy.research, abort.signal)
        : undefined
      const reply = await generateText(
        env,
        {
          instructions: policy.instructions,
          input: [
            {
              role: 'user',
              content: [
                {
                  type: 'input_text',
                  text: JSON.stringify({
                    instruction: request.instruction,
                    focus: request.focus,
                    story: request.story,
                    history: request.history.slice(-24),
                    research,
                  }),
                },
              ],
            },
          ],
        },
        abort.signal,
      )
      const sources = research?.sources.length
        ? '\n\nSources: ' + research.sources.map((url, i) => `[${i + 1}](<${url}>)`).join(' · ')
        : research
          ? '\n\nWeb research returned no cited sources; treat current claims as unverified.'
          : ''
      json(200, { reply: reply + sources })
    } catch (error) {
      json(error instanceof HttpError ? error.status : 502, {
        error: abort.signal.aborted
          ? 'Chat timed out. Your message is saved.'
          : error instanceof Error
            ? error.message
            : 'Chat could not finish. Please retry.',
      })
    } finally {
      clearTimeout(timeout)
    }
  }
}
