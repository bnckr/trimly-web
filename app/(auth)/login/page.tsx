"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelope, faEye } from "@fortawesome/free-solid-svg-icons";
import "./login.css";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    setLoading(false);

    if (error) {
      setErro("E-mail ou senha inválidos.");
      return;
    }

    router.replace("/dashboard");
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-left">
          <div className="brand">
            <img src="/images/trimly-logo.png" alt="Trimly" />
          </div>

          <div className="hero-text">
            <p className="welcome">Que bom te ver novamente!</p>

            <h1>
              GERENCIE SEU NEGÓCIO
              <br />
              COM FACILIDADE.
            </h1>

            <div className="hero-line" />

            <p className="subtitle">
              Controle seus agendamentos, clientes e serviços em um só lugar.
              <br />
              Mais organização, menos esforço.
            </p>
          </div>
        </div>

        <div className="login-right">
          <form className="login-form" onSubmit={handleLogin}>
            <h2>Login</h2>

            <div className="input-group">
              <input
                type="email"
                placeholder="E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <span className="input-icon">
                <FontAwesomeIcon icon={faEnvelope} />
              </span>
            </div>

            <div className="input-group">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
              />
              <button
                type="button"
                className="input-icon icon-button"
                onClick={() => setShowPassword(!showPassword)}
              >
                <FontAwesomeIcon icon={faEye} />
              </button>
            </div>

            <button type="button" className="forgot-password">
              Esqueci minha senha!
            </button>

            {erro ? <p className="login-error">{erro}</p> : null}

            <button className="login-button" type="submit" disabled={loading}>
              {loading ? "ENTRANDO..." : "ENTRAR"}
            </button>

            <p className="auth-switch">
              Ainda não tem conta? <a href="/cadastro">Criar conta</a>
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}
