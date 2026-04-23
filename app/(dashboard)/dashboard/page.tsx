'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function DashboardPage() {
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    async function loadSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.replace('/login')
        return
      }

      setEmail(session.user.email ?? null)
    }

    loadSession()
  }, [router])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  return (
    <main style={{ minHeight: '100vh', background: '#0f0f11', color: '#fff', padding: 24 }}>
      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          background: '#17181c',
          border: '1px solid #2a2c34',
          borderRadius: 20,
          padding: 24,
        }}
      >
        <h1 style={{ marginTop: 0 }}>Dashboard Trimly</h1>
        <p style={{ color: '#b3b8c5' }}>Usuário logado: {email ?? 'Carregando...'}</p>

        <button
          onClick={handleLogout}
          style={{
            marginTop: 16,
            height: 44,
            padding: '0 16px',
            borderRadius: 12,
            border: 'none',
            background: '#c8a96a',
            color: '#111',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Sair
        </button>
      </div>
    </main>
  )
}