'use client'

import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Profile = {
  nome: string
  email: string | null
  avatar_url: string | null
}

type HeaderProps = {
  profile: Profile | null
}

function getGreeting() {
  const hour = new Date().getHours()

  if (hour >= 5 && hour < 12) return 'Bom dia'
  if (hour >= 12 && hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

function getFirstName(name?: string | null) {
  if (!name) return 'Profissional'
  return name.trim().split(' ')[0]
}

function getInitials(name?: string | null) {
  if (!name) return 'T'

  const parts = name.trim().split(' ')

  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase()
  }

  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase()
}

export function Header({ profile }: HeaderProps) {
  const router = useRouter()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  const name = profile?.nome ?? 'Profissional'
  const firstName = getFirstName(name)
  const greeting = getGreeting()

  return (
    <header className="dashboard-header">
      <div>
        <p className="dashboard-eyebrow">Bem-vinda ao Trimly</p>
        <h1>
          {greeting}, {firstName}
        </h1>
      </div>

      <div className="header-user">
        <div className="user-avatar">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt={name} />
          ) : (
            <span>{getInitials(name)}</span>
          )}
        </div>

        <div className="user-info">
          <strong>{name}</strong>
          <span>{profile?.email ?? 'Profissional'}</span>
        </div>

        <button onClick={handleLogout}>Sair</button>
      </div>
    </header>
  )
}