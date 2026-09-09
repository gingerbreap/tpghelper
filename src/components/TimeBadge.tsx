interface TimeBadgeProps {
  bucket: string
}

export default function TimeBadge({ bucket }: TimeBadgeProps) {
  if (bucket === 'TBC') {
    return <span className="badge badge-tbc">TBC</span>
  }
  const cls = bucket === 'AM' ? 'badge-am' : bucket === 'PM' ? 'badge-pm' : 'badge-nt'
  return <span className={`badge ${cls}`}>{bucket}</span>
}
