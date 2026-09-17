import { useEffect, useRef } from 'react'
import { apiFetch } from '../ai/session'
import type { FancyBlock, Story, Style } from '../model/types'
import type { StoryUpdater } from '../model/store'
import { newId } from '../model/util'
import { fancyStyle, validFancyResult, type FancyRequest, type FancyResult } from './contract'
import { commitFancy, fancyInstruction, restoreFancy, updateFancy } from './state'

export type FancyProvider = (request: FancyRequest, signal: AbortSignal) => Promise<FancyResult>
export const connectedFancy: FancyProvider = async (request, signal) => {
  const response = await apiFetch('/api/fancy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
    signal,
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok)
    throw new Error(result.error || 'Text styling could not connect. Your instruction is saved.')
  if (!validFancyResult(result))
    throw new Error('The model returned an unsupported style. Your text is unchanged.')
  return result
}

export function useFancy(
  story: Story,
  style: Style,
  update: (fn: StoryUpdater, why?: string) => void,
  openChat: (id: string) => void,
  provider: FancyProvider = connectedFancy,
) {
  const latest = useRef({ story, style, update, openChat })
  latest.current = { story, style, update, openChat }
  const requests = useRef(new Map<string, { id: string; controller: AbortController }>())
  useEffect(
    () => () => {
      requests.current.forEach((r) => r.controller.abort())
      requests.current.clear()
    },
    [],
  )
  const patch = (id: string, fn: (b: FancyBlock) => FancyBlock) =>
    latest.current.update((s) => updateFancy(s, id, fn))
  const cancel = (id: string) => {
    requests.current.get(id)?.controller.abort()
    requests.current.delete(id)
    patch(id, (b) => ({ ...b, status: 'idle', requestId: undefined, error: undefined }))
  }
  const cancelAll = () => {
    for (const id of requests.current.keys()) cancel(id)
  }
  const generate = async (id: string, text?: string, fromMargin = false) => {
    const { story: s, style: view, openChat: open } = latest.current
    const block = s.blocks.find((b) => b.id === id)
    if (block?.type !== 'fancy' || requests.current.has(id)) return
    const instruction = (text ?? fancyInstruction(block)).trim()
    if (!instruction) return
    if (!block.text.trim()) {
      patch(id, (b) => ({
        ...b,
        editDraft: instruction,
        status: 'error',
        error: 'Write some text first, then ask how it should look.',
      }))
      return
    }
    const requestId = newId(),
      controller = new AbortController()
    requests.current.set(id, { id: requestId, controller })
    if (fromMargin) open(id)
    patch(id, (b) => ({ ...b, status: 'rendering', requestId, editDraft: instruction, error: undefined }))
    try {
      const result = await provider(
        {
          text: block.text,
          instruction,
          previous: fancyStyle(block.fancy),
          history: (s.chats[id] || []).slice(-16).map(({ me, text }) => ({ me, text: text.slice(0, 6000) })),
          style: {
            bodyFont: view.bodyFont,
            headerFont: view.headerFont,
            bg: view.bg,
            ink: view.ink,
            size: view.size,
          },
        },
        controller.signal,
      )
      if (!validFancyResult(result))
        throw new Error('The model returned an unsupported style. Your text is unchanged.')
      if (!controller.signal.aborted)
        latest.current.update((s) => commitFancy(s, id, requestId, instruction, result), 'Text styled')
    } catch (error) {
      if (!controller.signal.aborted)
        patch(id, (b) =>
          b.requestId === requestId
            ? {
                ...b,
                status: 'error',
                requestId: undefined,
                error: error instanceof Error ? error.message : 'Text styling could not finish.',
              }
            : b,
        )
    } finally {
      if (requests.current.get(id)?.id === requestId) requests.current.delete(id)
    }
  }
  return {
    generate,
    cancel,
    cancelAll,
    setEdit: (id: string, editDraft: string) => patch(id, (b) => ({ ...b, editDraft })),
    restore: (id: string, revision: number) => {
      cancel(id)
      latest.current.update((s) => restoreFancy(s, id, revision), 'Text style restored')
    },
  }
}
export type FancyCtl = ReturnType<typeof useFancy>
