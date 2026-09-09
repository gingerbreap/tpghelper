import { getActiveProgramme } from '../programmes'

const GA_ID = getActiveProgramme().analyticsId

export function trackPageView(path: string) {
  window.gtag?.('event', 'page_view', {
    page_path: path,
    send_to: GA_ID,
  })
}
