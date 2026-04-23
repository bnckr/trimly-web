'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import '../login/login.css'

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')

  async function handleRecover(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErro('')
    setMensagem('')
    setLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/nova-senha`,
    })

    setLoading(false)

    if (error) {
      setErro(error.message)
      return
    }

    setMensagem('Se o e-mail estiver cadastrado, enviaremos um link de recuperação.')
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-left">
          <div className="brand">
            <img src="/images/trimly-logo.png" alt="Trimly" className="brand-logo" />
          </div>

          <div className="hero-text">
            <p className="welcome">Vamos recuperar seu acesso</p>

            <h1>
              REDEFINA SUA SENHA
              <br />
              COM SEGURANÇA.
            </h1>

            <div className="hero-line" />

            <p className="subtitle">
              Informe seu e-mail e enviaremos um link para você criar uma nova senha.
            </p>
          </div>
        </div>

        <div className="login-right">
          <form className="login-form" onSubmit={handleRecover}>
            <h2>Recuperar senha</h2>

            <div className="input-group">
              <input
                type="email"
                placeholder="E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {erro ? <p className="login-error">{erro}</p> : null}
            {mensagem ? <p className="login-success">{mensagem}</p> : null}

            <button className="login-button" type="submit" disabled={loading}>
              {loading ? 'ENVIANDO...' : 'ENVIAR LINK'}
            </button>

            <p className="auth-switch">
              Lembrou sua senha? <Link href="/login">Entrar</Link>
            </p>
          </form>
        </div>
      </section>
    </main>
  )
}