import { useMemo, useState } from 'react'
import AboutBackLink from '../components/AboutBackLink'
import { TeachingPlanNoticeBody, buildSelectedSet } from '../components/TeachingPlanNoticeBody'
import { teachingPlanNotices } from '../data/teachingPlanUpdates'
import { useI18n } from '../i18n/context'
import { useSelections } from '../hooks/useSelections'
import { archiveCourseNumbers } from '../utils/appMeta'

export default function TeachingPlanArchive() {
  const { t } = useI18n()
  const { selections } = useSelections()
  const selectedSet = useMemo(() => buildSelectedSet(selections), [selections])
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(teachingPlanNotices.map(n => [n.id, true])),
  )

  return (
    <div className="about-subpage">
      <AboutBackLink />
      <h1 className="page-title">{t('teachingPlan.archiveTitle')}</h1>

      <div className="archive-list">
        {teachingPlanNotices.map(notice => {
          const expanded = expandedIds[notice.id] !== false
          const title = t('teachingPlan.archiveNoticeTitle', {
            timestamp: notice.timestamp,
            courses: archiveCourseNumbers(notice.courseRefs),
          })
          return (
            <div key={notice.id} className="card archive-notice-card">
              <button
                type="button"
                className="archive-notice-toggle"
                onClick={() =>
                  setExpandedIds(prev => ({ ...prev, [notice.id]: !expanded }))
                }
                aria-expanded={expanded}
              >
                <span className="archive-notice-title">{title}</span>
                <span className="archive-notice-chevron" aria-hidden="true">
                  <i className={expanded ? 'fas fa-caret-down' : 'fas fa-caret-right'} />
                </span>
              </button>
              {expanded && (
                <div className="archive-notice-body">
                  <TeachingPlanNoticeBody notice={notice} selectedSet={selectedSet} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
