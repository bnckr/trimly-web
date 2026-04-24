'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { ClientModal } from '@/components/clientes/client-modal'
import './clientes.css'

type Profile = {
  nome: string
  email: string | null
  avatar_url: string | null
}

type Client = {
  id: string
  nome: string
  telefone: string
  telefone_normalizado?: string
  data_nascimento: string | null
  email: string | null
  observacoes: string | null
  preferencias: string | null
  origem_cliente: string | null
  ativo: boolean
}

export default function ClientesPage() {
  const router = useRouter()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [search, setSearch] = useState('')
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  async function loadClients() {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('nome', { ascending: true })

    if (error) {
      console.error(error)
      return
    }

    setClients((data ?? []) as Client[])
  }

  useEffect(() => {
    async function loadPage() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.replace('/login')
        return
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('nome, email, avatar_url')
        .eq('id', session.user.id)
        .single()

      setProfile({
        nome: profileData?.nome ?? session.user.email ?? 'Profissional',
        email: profileData?.email ?? session.user.email ?? null,
        avatar_url: profileData?.avatar_url ?? null,
      })

      await loadClients()
      setLoading(false)
    }

    loadPage()
  }, [router])

  const filteredClients = useMemo(() => {
    const term = search.toLowerCase().trim()
    const phoneTerm = search.replace(/\D/g, '')

    if (!term) return clients

    return clients.filter((client) => {
      const phone = client.telefone_normalizado ?? client.telefone.replace(/\D/g, '')

      return (
        client.nome.toLowerCase().includes(term) ||
        client.telefone.toLowerCase().includes(term) ||
        phone.includes(phoneTerm)
      )
    })
  }, [clients, search])

  async function deactivateClient(id: string) {
    const confirmDelete = confirm('Deseja inativar este cliente?')

    if (!confirmDelete) return

    const { error } = await supabase
      .from('clients')
      .update({ ativo: false })
      .eq('id', id)

    if (error) {
      alert(error.message)
      return
    }

    await loadClients()
  }

  if (loading) {
    return <main className="clientes-loading">Carregando clientes...</main>
  }

  return (
    <main className="clientes-shell">
      <Sidebar />

      <section className="clientes-main">
        <Header profile={profile} />

        <div className="clientes-toolbar">
          <div>
            <p className="clientes-eyebrow">Base global</p>
            <h2>Clientes</h2>
          </div>

          <button
            className="primary-button"
            onClick={() => {
              setSelectedClient(null)
              setModalOpen(true)
            }}
          >
            Novo cliente
          </button>
        </div>

        <section className="clientes-panel">
          <div className="clientes-panel-header">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou telefone..."
            />

            <span>
              {filteredClients.length}{' '}
              {filteredClients.length === 1 ? 'cliente' : 'clientes'}
            </span>
          </div>

          {filteredClients.length === 0 ? (
            <div className="clientes-empty">
              <h3>Nenhum cliente encontrado</h3>
              <p>Cadastre seu primeiro cliente para começar os agendamentos.</p>
            </div>
          ) : (
            <div className="clientes-table">
              <div className="clientes-table-head">
                <span>Nome</span>
                <span>Telefone</span>
                <span>Nascimento</span>
                <span>Status</span>
                <span>Ações</span>
              </div>

              {filteredClients.map((client) => (
                <div className="clientes-table-row" key={client.id}>
                  <strong>{client.nome}</strong>
                  <span>{client.telefone}</span>
                  <span>
                    {client.data_nascimento
                      ? new Date(
                          Number(client.data_nascimento.split('-')[0]),
                          Number(client.data_nascimento.split('-')[1]) - 1,
                          Number(client.data_nascimento.split('-')[2])
                        ).toLocaleDateString('pt-BR')
                      : '-'}
                  </span>
                  <span className={client.ativo ? 'status-active' : 'status-inactive'}>
                    {client.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                  <div className="clientes-actions">
                    <button
                      onClick={() => {
                        setSelectedClient(client)
                        setModalOpen(true)
                      }}
                    >
                      Editar
                    </button>

                    {client.ativo ? (
                      <button onClick={() => deactivateClient(client.id)}>
                        Inativar
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </section>

      <ClientModal
        open={modalOpen}
        client={selectedClient}
        onClose={() => setModalOpen(false)}
        onSaved={loadClients}
      />
    </main>
  )
}