import { useEffect, useMemo, useState } from 'react'
import { useTeachingPlanNotices } from './useTeachingPlanNotices'
import {
  teachingPlanDismissEventName,
  unreadTeachingPlanNoticeIds,
} from '../utils/teachingPlanDismiss'

/** Reactive set of Teaching Plan notice ids that are not yet dismissed. */
export function useUnreadTeachingPlanNoticeIds(): Set<string> {
  const teachingPlanNotices = useTeachingPlanNotices()
  const [epoch, setEpoch] = useState(0)

  useEffect(() => {
    const bump = () => setEpoch(n => n + 1)
    const names = teachingPlanNotices.map(n => teachingPlanDismissEventName(n.id))
    for (const name of names) window.addEventListener(name, bump)
    window.addEventListener('storage', bump)
    return () => {
      for (const name of names) window.removeEventListener(name, bump)
      window.removeEventListener('storage', bump)
    }
  }, [teachingPlanNotices])

return useMemo(() => {
    void teachingPlanNotices
    return unreadTeachingPlanNoticeIds()
  }, [epoch, teachingPlanNotices])
}
