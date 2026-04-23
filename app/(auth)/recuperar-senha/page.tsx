'use client'

import { FormEvent, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function RecoverPasswordPage() {
  const [email, setEmail] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleRecover(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErro('')
    setMensagem('')
    setLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email)

    setLoading(false)

    if (error) {
      setErro('Não foi possível enviar o e-mail de recuperação.')
      return
    }

    setMensagem('Se o e-mail existir, o link de recuperação foi enviado.')
  }

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <h1>Recuperar senha</h1>
        <form onSubmit={handleRecover} style={{ display: 'grid', gap: 12 }}>
          <input
            type="email"
            placeholder="Seu e-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Enviando...' : 'Enviar link'}
          </button>
        </form>
        {mensagem ? <p>{mensagem}</p> : null}
        {erro ? <p>{erro}</p> : null}
      </div>
    </main>
  )
}