'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import '../login/login.css'

export default function CadastroPage() {
  const router = useRouter()

  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')

  async function handleCadastro(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErro('')
    setMensagem('')
    setLoading(true)

    const { error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        data: {
          nome,
        },
      },
    })

    setLoading(false)

    if (error) {
      setErro(error.message)
      return
    }

    setMensagem('Conta criada com sucesso! Verifique seu e-mail ou faça login.')
    setTimeout(() => router.replace('/login'), 1800)
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-left">
          <div className="brand">
            <img src="/images/trimly-logo.png" alt="Trimly" className="brand-logo" />
          </div>

          <div className="hero-text">
            <p className="welcome">Bem-vindo ao Trimly!</p>

            <h1>
              CRIE SUA CONTA
              <br />
              E ORGANIZE SUA AGENDA.
            </h1>

            <div className="hero-line" />

            <p className="subtitle">
              Cadastre-se para gerenciar seus clientes, serviços e horários
              em um só lugar.
            </p>
          </div>
        </div>

        <div className="login-right">
          <form className="login-form" onSubmit={handleCadastro}>
            <h2>Cadastro</h2>

            <div className="input-group">
              <input
                type="text"
                placeholder="Nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <input
                type="email"
                placeholder="E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <input
                type="password"
                placeholder="Senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                minLength={6}
              />
            </div>

            {erro ? <p className="login-error">{erro}</p> : null}
            {mensagem ? <p className="login-success">{mensagem}</p> : null}

            <button className="login-button" type="submit" disabled={loading}>
              {loading ? 'CRIANDO...' : 'CRIAR CONTA'}
            </button>

            <p className="auth-switch">
              Já tem conta? <a href="/login">Entrar</a>
            </p>
          </form>
        </div>
      </section>
    </main>
  )
}