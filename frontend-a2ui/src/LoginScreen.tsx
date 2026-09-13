import { useState } from 'react'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export function LoginScreen({ onSuccess }: { onSuccess: (usuarioId: string) => void }) {
  const [matricula, setMatricula] = useState('')
  const [nombre, setNombre] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matricula, nombre }),
      })

      if (!res.ok) throw new Error('Credenciales incorrectas.')

      const data = await res.json()
      localStorage.setItem('usuario_id', data.usuario_id)
      onSuccess(data.usuario_id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-gray-light">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Inicia sesión</h1>
        <input
          value={matricula}
          onChange={(e) => setMatricula(e.target.value)}
          placeholder="Matrícula"
          className="w-full rounded-lg border px-3 py-2 text-sm"
        />
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre"
          className="w-full rounded-lg border px-3 py-2 text-sm"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-brand-red py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </main>
  )
}
