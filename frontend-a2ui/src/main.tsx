import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { LoginScreen } from './LoginScreen'

function Root() {
  const [usuarioId, setUsuarioId] = useState<string | null>(() => localStorage.getItem('usuario_id'))

  if (!usuarioId) return <LoginScreen onSuccess={setUsuarioId} />
  return <App usuarioId={usuarioId} />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
