import { createRoot } from 'react-dom/client'
import './index.css'

const root = createRoot(document.getElementById('root')!)

function dismissBootSplash() {
  const splash = document.getElementById('tpg-boot-splash')
  if (splash) splash.classList.add('is-done')
}

if (__PROGRAMME_ID__ === 'lander') {
  void import('./lander/bootstrap').then(({ mountLander }) => {
    mountLander(root)
    dismissBootSplash()
  })
} else {
  void import('./appBootstrap').then(({ mountApp }) => {
    mountApp(root)
    dismissBootSplash()
  })
}
