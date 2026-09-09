import { createRoot } from 'react-dom/client'
import './index.css'

const root = createRoot(document.getElementById('root')!)

if (__PROGRAMME_ID__ === 'lander') {
  void import('./lander/bootstrap').then(({ mountLander }) => {
    mountLander(root)
  })
} else {
  void import('./appBootstrap').then(({ mountApp }) => {
    mountApp(root)
  })
}
