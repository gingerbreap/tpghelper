export type StreamTagVariant = 'ai-a' | 'ai-b' | 'mc-c' | 'mc-d' | 'default'

const STREAM_TAG_MAP: Record<string, { label: string; variant: StreamTagVariant }> = {
  'AI-M': { label: 'AI-A', variant: 'ai-a' },
  'AI-A': { label: 'AI-B', variant: 'ai-b' },
  'MC-AM': { label: 'MC-C', variant: 'mc-c' },
  'MC-DE': { label: 'MC-D', variant: 'mc-d' },
}

export function streamTagDisplay(tag: string): { label: string; variant: StreamTagVariant } {
  return STREAM_TAG_MAP[tag] ?? { label: tag, variant: 'default' }
}
