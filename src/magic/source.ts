import type { MagicBlock } from '../model/types'

/** Capture only the data file actually charted; other modes can use all references. */
export function sourceNames(block: MagicBlock): string[] {
  if (block.mode !== 'data') return block.attachments.map((a) => a.name)
  const file = block.attachments.find((a) => a.kind === 'data')
  return file ? [file.name] : block.revisions[block.revision]?.sourceNames || []
}

export function sourceCaption(block: MagicBlock) {
  const revision = block.revisions[block.revision]
  const names = (revision?.sourceNames ?? sourceNames(block)).join(', ')
  if (block.mode === 'data') return names ? `Source: ${names}` : 'Source: sample data'
  const origin = revision?.output.demo
    ? 'Local sample'
    : block.mode === 'image'
      ? 'Generated image'
      : 'Generated graphic'
  return names ? `${origin} · ${names}` : `${origin} · from your prompt`
}
