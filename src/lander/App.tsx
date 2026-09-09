import { Navigate, Route, Routes } from 'react-router-dom'
import AuthGate from './pages/AuthGate'
import ProgrammePicker from './pages/ProgrammePicker'

export default function LanderApp() {
  return (
    <Routes>
      <Route path="/" element={<AuthGate />} />
      <Route path="/programmes" element={<ProgrammePicker />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
