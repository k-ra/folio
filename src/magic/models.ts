/** Image-tool choices supported by the connected OpenAI bridge. */
export const IMAGE_MODELS = [
  { id: 'default', name: 'Server default' },
  { id: 'gpt-image-2.5-sunburst', name: 'GPT Image 2.5 Sunburst' },
  { id: 'gpt-image-2.5-flare', name: 'GPT Image 2.5 Flare' },
] as const

export type ImageModel = (typeof IMAGE_MODELS)[number]['id']
export const DEFAULT_IMAGE_MODEL = 'gpt-image-2.5-sunburst'
export const isImageModel = (value: unknown): value is ImageModel => IMAGE_MODELS.some((m) => m.id === value)

/** Missing values from older stories preserve the server configuration. */
export function imageGenerationTool(value: unknown, serverDefault = DEFAULT_IMAGE_MODEL) {
  if (value !== undefined && !isImageModel(value)) throw new Error('Choose a supported image model in Style → Images.')
  return { type: 'image_generation' as const, model: !value || value === 'default' ? serverDefault : value }
}
