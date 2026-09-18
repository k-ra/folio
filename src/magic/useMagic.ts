import { useEffect, useRef } from 'react'
import type { StoryUpdater } from '../model/store'
import type { Attachment, MagicBlock, MagicLayout, MagicMode, Story, Style } from '../model/types'
import { newId } from '../model/util'
import { commitArtifact, currentRevision, marginInstruction, restoreArtifact, updateMagic } from './state'
import { connectedProvider, previewProvider, generationMode, type ArtifactProvider } from './provider'
import { sourceNames } from './source'
import { validateAttachments } from './limits'
import { readConnection, useConnection } from '../ai/connection'

export function useMagic(
  story: Story,
  style: Style,
  update: (fn: StoryUpdater, why?: string) => void,
  openChat: (id: string) => void,
  overrideProvider?: ArtifactProvider,
) {
  const latest = useRef({ story, style, update, openChat })
  latest.current = { story, style, update, openChat }
  const requests = useRef(new Map<string, { id: string; controller: AbortController }>())
  const connection = useConnection()
  const connected = connection?.configured === true
  useEffect(
    () => () => {
      requests.current.forEach((r) => r.controller.abort())
      requests.current.clear()
    },
    [],
  )
  const patch = (id: string, fn: (b: MagicBlock) => MagicBlock) =>
    latest.current.update((s) => updateMagic(s, id, fn))
  const cancel = (id: string) => {
    requests.current.get(id)?.controller.abort()
    requests.current.delete(id)
    patch(id, (b) => ({
      ...b,
      status: b.revision >= 0 ? 'done' : 'prompt',
      requestId: undefined,
      error: undefined,
    }))
  }
  const cancelAll = () => {
    for (const id of requests.current.keys()) cancel(id)
  }
  const generate = async (id: string, text?: string, fromMargin = false, removeBackground = false) => {
    const { story: s, style, openChat: open } = latest.current
    const b = s.blocks.find((b) => b.id === id)
    if (!b || b.type !== 'magic' || requests.current.has(id)) return
    const imageBackground = removeBackground ? 'transparent' : b.imageBackground || style.imageBackground
    const view = { ...style, ...(imageBackground ? { imageBackground } : {}) }
    const instruction = (text ?? (b.revision >= 0 ? marginInstruction(b) : b.prompt)).trim()
    if (!instruction) return
    const requestId = newId(),
      controller = new AbortController()
    requests.current.set(id, { id: requestId, controller })
    if (fromMargin) open(id)
    patch(id, (x) => ({
      ...x,
      status: 'rendering',
      requestId,
      error: undefined,
      ...(x.revision >= 0 ? { editDraft: instruction } : {}),
      ...(removeBackground ? { imageBackground: 'transparent', provider: 'connected' } : {}),
    }))
    try {
      const configured =
        connection ?? (overrideProvider ? { configured: false } : await readConnection(controller.signal))
      controller.signal.throwIfAborted()
      const mode = removeBackground ? 'connected' : generationMode(b.provider, configured.configured)
      const provider = overrideProvider || (mode === 'connected' ? connectedProvider : previewProvider)
      const output = await provider.generate(
        {
          mode: b.mode,
          layout: b.layout || 'column',
          instruction,
          originalPrompt: b.prompt,
          attachments: b.attachments,
          previous: currentRevision(b)?.output,
          history: b.revisions.slice(0, b.revision + 1).map((r) => r.instruction),
          style: view,
          ...(b.mode === 'image' && imageBackground ? { imageBackground } : {}),
        },
        controller.signal,
      )
      if (!controller.signal.aborted)
        latest.current.update(
          (s) => commitArtifact(s, id, requestId, instruction, output, view, sourceNames(b), mode),
          'Artifact updated',
        )
    } catch (error) {
      if (!controller.signal.aborted)
        patch(id, (b) =>
          b.requestId === requestId
            ? {
                ...b,
                status: 'error',
                requestId: undefined,
                error: error instanceof Error ? error.message : 'Generation failed. Please retry.',
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
    connected,
    imagesConnected: connection?.images === true,
    setImageBackground: (id: string, imageBackground: 'opaque' | 'transparent') =>
      patch(id, (b) => (b.status === 'rendering' ? b : { ...b, imageBackground })),
    removeBackground: (id: string) =>
      generate(
        id,
        'Remove the background. Preserve the subject, its details, colors, and composition. Return a true transparent PNG with clean edges, no matte or checkerboard.',
        false,
        true,
      ),
    setLayout: (id: string, layout: MagicLayout) =>
      latest.current.update((s) => updateMagic(s, id, (b) => ({ ...b, layout })), 'Artifact layout'),
    setProvider: (id: string, provider: 'preview' | 'connected') =>
      patch(id, (b) => (b.status === 'rendering' ? b : { ...b, provider })),
    setMode: (id: string, mode: MagicMode) =>
      patch(id, (b) =>
        b.status === 'rendering' || b.revision >= 0 ? b : { ...b, mode, error: undefined, status: 'prompt' },
      ),
    setEdit: (id: string, editDraft: string) => patch(id, (b) => ({ ...b, editDraft })),
    attach: (id: string, files: Attachment[]) => {
      const block = latest.current.story.blocks.find((b) => b.id === id)
      if (!block || block.type !== 'magic' || block.status === 'rendering') return
      validateAttachments([...block.attachments, ...files])
      patch(id, (b) => {
        if (b.status === 'rendering') return b
        // Recheck the actual queued state: two uploads can finish in one render.
        try {
          validateAttachments([...b.attachments, ...files])
          return { ...b, attachments: [...b.attachments, ...files], error: undefined }
        } catch (error) {
          return { ...b, error: error instanceof Error ? error.message : 'Could not attach these files.' }
        }
      })
    },
    detach: (id: string, aid: string) =>
      patch(id, (b) => ({ ...b, attachments: b.attachments.filter((a) => a.id !== aid) })),
    restore: (id: string, revision: number) => {
      cancel(id)
      latest.current.update((s) => restoreArtifact(s, id, revision), 'Artifact restored')
    },
  }
}
export type MagicCtl = ReturnType<typeof useMagic>
