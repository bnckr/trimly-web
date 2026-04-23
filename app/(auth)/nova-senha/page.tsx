'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import '../login/login.css'

export default function NovaSenhaPage() {
  const router = useRouter()

  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')

  async function handleUpdatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErro('')
    setMensagem('')

    if (senha.length < 6) {
      setErro('A senha precisa ter pelo menos 6 caracteres.')
      return
    }

    if (senha !== confirmarSenha) {
      setErro('As senhas não coincidem.')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.updateUser({
      password: senha,
    })

    setLoading(false)

    if (error) {
      setErro(error.message)
      return
    }

    setMensagem('Senha atualizada com sucesso! Redirecionando para o login...')

    setTimeout(async () => {
      await supabase.auth.signOut()
      router.replace('/login')
    }, 1600)
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-left">
          <div className="brand">
            <img src="/images/trimly-logo.png" alt="Trimly" className="brand-logo" />
          </div>

          <div className="hero-text">
            <p className="welcome">Quase lá!</p>

            <h1>
              CRIE UMA NOVA
              <br />
              SENHA DE ACESSO.
            </h1>

            <div className="hero-line" />

            <p className="subtitle">
              Escolha uma senha segura para voltar a acessar sua agenda no Trimly.
            </p>
          </div>
        </div>

        <div className="login-right">
          <form className="login-form" onSubmit={handleUpdatePassword}>
            <h2>Nova senha</h2>

            <div className="input-group">
              <input
                type="password"
                placeholder="Nova senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <div className="input-group">
              <input
                type="password"
                placeholder="Confirmar senha"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                required
                minLength={6}
              />
            </div>

            {erro ? <p className="login-error">{erro}</p> : null}
            {mensagem ? <p className="login-success">{mensagem}</p> : null}

            <button className="login-button" type="submit" disabled={loading}>
              {loading ? 'SALVANDO...' : 'SALVAR SENHA'}
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