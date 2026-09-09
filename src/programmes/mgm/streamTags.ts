export type StreamTagVariant = 'esg' | 'default'

const STREAM_TAG_MAP: Record<string, { label: string; variant: StreamTagVariant }> = {
  ESG: { label: 'ESG', variant: 'esg' },
}

export function streamTagDisplay(tag: string): { label: string; variant: StreamTagVariant } {
  return STREAM_TAG_MAP[tag] ?? { label: tag, variant: 'default' }
}
