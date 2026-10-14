export type StreamTagVariant = 'ars' | 'thy' | 'da' | 'pl' | 'default'

/** Stream ids used in requirements / UI (forced selection). */
export const MECON_STREAMS = [
  { id: 'ARS', name: 'Advanced Research Stream' },
  { id: 'THY', name: 'Theory Stream' },
  { id: 'DA', name: 'Data Analysis Stream' },
  { id: 'PL', name: 'Policy Analysis Stream' },
] as const

export type MeconStreamId = (typeof MECON_STREAMS)[number]['id']

const STREAM_TAG_MAP: Record<string, { label: string; variant: StreamTagVariant }> = {
  ARS: { label: 'ARS', variant: 'ars' },
  THY: { label: 'THY', variant: 'thy' },
  DA: { label: 'DA', variant: 'da' },
  PL: { label: 'PL', variant: 'pl' },
  /** Course-level visibility / type tags (not concentration lists). */
  'Stream-Core': { label: 'Stream Core', variant: 'default' },
  Capstone: { label: 'Capstone', variant: 'default' },
}

export function streamTagDisplay(tag: string): { label: string; variant: StreamTagVariant } {
  return STREAM_TAG_MAP[tag] ?? { label: tag, variant: 'default' }
}
