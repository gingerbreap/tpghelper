import type { MeconBadge } from '../utils/meconCourseView'

interface MeconRoleBadgesProps {
  badges: MeconBadge[]
}

export default function MeconRoleBadges({ badges }: MeconRoleBadgesProps) {
  if (badges.length === 0) return null
  return (
    <>
      {badges.map(b => (
        <span
          key={b.label}
          className={`badge badge-mecon badge-mecon--${b.variant}`}
        >
          {b.label}
        </span>
      ))}
    </>
  )
}
