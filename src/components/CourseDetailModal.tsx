import AppDialog from './AppDialog'
import { CourseDetailContent } from '../pages/CourseDetail'
import { useI18n } from '../i18n/context'

const TITLE_ID = 'course-detail-dialog-title'

interface CourseDetailModalProps {
  courseCode: string
  onClose: () => void
}

export default function CourseDetailModal({ courseCode, onClose }: CourseDetailModalProps) {
  const { t } = useI18n()

  return (
    <AppDialog
      open
      onClose={onClose}
      labelledBy={TITLE_ID}
      label={t('courseDetail.modalLabel')}
      closeLabel={t('common.close')}
    >
      <div className="modal-body">
        <CourseDetailContent
          courseCode={courseCode}
          compact
          titleId={TITLE_ID}
        />
      </div>
    </AppDialog>
  )
}
