import {
  teachingPlanNotices,
  type TeachingPlanNotice,
} from '../data/teachingPlanUpdates'
import { getActiveProgramme } from '../programmes'

const programme = getActiveProgramme()
const DISMISS_PREFIX = `${programme.id}-dismiss-teaching-plan-notice`
const LEGACY_DISMISS_KEY = `${programme.id}-dismiss-teaching-plan-notice`
const LEGACY_NOTICE_ID = programme.id === 'msba' ? '20260818-7015-7037' : ''

export function teachingPlanDismissStorageKey(noticeId: string): string {
  return LEGACY_NOTICE_ID && noticeId === LEGACY_NOTICE_ID
    ? LEGACY_DISMISS_KEY
    : `${DISMISS_PREFIX}:${noticeId}`
}

export function teachingPlanDismissVersion(notice: TeachingPlanNotice): string {
  return notice.updates.map(u => u.courseCode).join('+')
}

export function teachingPlanDismissEventName(noticeId: string): string {
  return `${programme.id}:dismiss-teaching-plan-${noticeId}`
}

export function isTeachingPlanNoticeDismissed(notice: TeachingPlanNotice): boolean {
  const version = teachingPlanDismissVersion(notice)
  if (!version) return false
  try {
    return localStorage.getItem(teachingPlanDismissStorageKey(notice.id)) === version
  } catch {
    return false
  }
}

/** Notices the user has not yet dismissed via 「已读」 / Mark as read. */
export function listUnreadTeachingPlanNotices(): TeachingPlanNotice[] {
  return teachingPlanNotices.filter(n => !isTeachingPlanNoticeDismissed(n))
}

export function unreadTeachingPlanNoticeIds(): Set<string> {
  return new Set(listUnreadTeachingPlanNotices().map(n => n.id))
}

/** Dismiss every currently unread Teaching Plan notice in one shot (no sequential UI). */
export function dismissAllTeachingPlanNotices(): void {
  for (const notice of teachingPlanNotices) {
    if (isTeachingPlanNoticeDismissed(notice)) continue
    const version = teachingPlanDismissVersion(notice)
    if (!version) continue
    try {
      localStorage.setItem(teachingPlanDismissStorageKey(notice.id), version)
    } catch {
      /* ignore quota / private mode */
    }
    window.dispatchEvent(new Event(teachingPlanDismissEventName(notice.id)))
  }
}
