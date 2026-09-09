import { useRequirements, useCourses } from '../hooks/useCoursesData'
import { useI18n } from '../i18n/context'
import { getActiveProgramme } from '../programmes'
import { formatEnrollmentRuleMessage } from '../hooks/useSelections'
import type { Stream, StreamList } from '../types'

function isFlatStream(stream: Stream): stream is Stream & { minRequired: number; courses: string[] } {
  return Array.isArray(stream.courses) && typeof stream.minRequired === 'number'
}

function getNestedLists(stream: Stream): StreamList[] {
  return Object.values(stream).filter(
    (v): v is StreamList =>
      typeof v === 'object' && v !== null && 'courses' in v && Array.isArray(v.courses),
  )
}

export default function Requirements() {
  const { t, tList, locale } = useI18n()
  const req = useRequirements()
  const { courses } = useCourses()
  const programme = getActiveProgramme()
  const preferJsonCopy = programme.id === 'mgm'

  if (!req) return <div style={{ padding: 40, textAlign: 'center' }}>{t('common.loading')}</div>

  const getTitle = (code: string) => courses.find(c => c.courseCode === code)?.courseTitle || code
  const planningRules =
    preferJsonCopy && req.planningRules.length > 0
      ? req.planningRules
      : tList('requirements.planningRules')
  const notes =
    preferJsonCopy && req.notes.length > 0 ? req.notes : tList('requirements.notes')

  const showEnrollmentRules =
    programme.features.enrollmentRules &&
    req.enrollmentRules &&
    req.enrollmentRules.length > 0

  return (
    <div>
      <h1 className="page-title">{t('requirements.title')}</h1>

      <div className="card req-section">
        <h2>{t('requirements.overviewTitle')}</h2>
        <p style={{ fontSize: 14, marginBottom: 12 }}>
          {t('requirements.overviewBody', {
            total: req.totalCourses,
            credits: req.creditsPerCourse,
            electives: req.electiveCount,
          })}
        </p>
      </div>

      <div className="card req-section">
        <h2>{t('requirements.coreTitle')}</h2>
        <ul className="course-list">
          {req.coreCourses.map(code => (
            <li key={code}><strong>{code}</strong> — {getTitle(code)}</li>
          ))}
        </ul>
      </div>

      <div className="card req-section">
        <h2>{t('requirements.capstoneTitle')}</h2>
        <ul className="course-list">
          {req.capstoneCourses.map(c => (
            <li key={c.courseCode}><strong>{c.courseCode}</strong> — {c.courseTitle}</li>
          ))}
        </ul>
      </div>

      <h2 style={{ fontSize: 18, margin: '24px 0 12px' }}>{t('requirements.streamsTitle')}</h2>

      {Object.entries(req.streams).map(([key, stream]) => {
        const isEsg = key === 'ESG'
        const isAi = key === 'AI'
        const isMc = key === 'MC'
        const title = isEsg
          ? t('requirements.esgTitle')
          : isAi
            ? t('requirements.aiTitle')
            : isMc
              ? t('requirements.mcTitle')
              : stream.name
        const description = isEsg
          ? t('requirements.esgDescription')
          : isAi
            ? t('requirements.aiDescription')
            : isMc
              ? t('requirements.mcDescription')
              : stream.description

        return (
          <div className="stream-card" key={key}>
            <h3>{title}</h3>
            <p>{description}</p>
            {isFlatStream(stream) ? (
              <div>
                <h4 style={{ fontSize: 14, marginBottom: 8 }}>
                  {t('requirements.esgElectives', { min: stream.minRequired })}
                </h4>
                <ul className="course-list">
                  {stream.courses.map(code => (
                    <li key={code}><strong>{code}</strong> — {getTitle(code)}</li>
                  ))}
                </ul>
              </div>
            ) : isAi || isMc ? (
              <div className="stream-lists">
                {isAi && (
                  <>
                    <div>
                      <h4 style={{ fontSize: 14, marginBottom: 8 }}>{t('requirements.listA')}</h4>
                      <ul className="course-list">
                        {(stream.listA as StreamList).courses.map(code => (
                          <li key={code}><strong>{code}</strong> — {getTitle(code)}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 style={{ fontSize: 14, marginBottom: 8 }}>{t('requirements.listB')}</h4>
                      <ul className="course-list">
                        {(stream.listB as StreamList).courses.map(code => (
                          <li key={code}><strong>{code}</strong> — {getTitle(code)}</li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}
                {isMc && (
                  <>
                    <div>
                      <h4 style={{ fontSize: 14, marginBottom: 8 }}>{t('requirements.listC')}</h4>
                      <ul className="course-list">
                        {(stream.listC as StreamList).courses.map(code => (
                          <li key={code}><strong>{code}</strong> — {getTitle(code)}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 style={{ fontSize: 14, marginBottom: 8 }}>{t('requirements.listD')}</h4>
                      <ul className="course-list">
                        {(stream.listD as StreamList).courses.map(code => (
                          <li key={code}><strong>{code}</strong> — {getTitle(code)}</li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="stream-lists">
                {getNestedLists(stream).map(list => (
                  <div key={list.name}>
                    <h4 style={{ fontSize: 14, marginBottom: 8 }}>
                      {t('requirements.listMinRequired', {
                        name: list.name,
                        min: list.minRequired,
                      })}
                    </h4>
                    <ul className="course-list">
                      {list.courses.map(code => (
                        <li key={code}><strong>{code}</strong> — {getTitle(code)}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {showEnrollmentRules && (
        <div className="card req-section">
          <h2>{t('requirements.enrollmentRulesTitle')}</h2>
          <ul className="course-list">
            {req.enrollmentRules!.map((rule, i) => (
              <li key={i} style={{ fontSize: 13 }}>
                {formatEnrollmentRuleMessage(rule, locale)}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card req-section">
        <h2>{t('requirements.planningTitle')}</h2>
        <ul className="course-list">
          {planningRules.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </div>

      <div className="card req-section">
        <h2>{t('requirements.notesTitle')}</h2>
        <ul className="course-list">
          {notes.map((n, i) => (
            <li key={i} style={{ fontSize: 13, color: '#5f6368' }}>{n}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
