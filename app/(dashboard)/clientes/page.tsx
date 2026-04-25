'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { ClientModal } from '@/components/clientes/client-modal'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useToast } from '@/components/ui/toast-provider'

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

function formatBirthDate(dateString: string | null) {
  if (!dateString) return '-'

  const [year, month, day] = dateString.split('-').map(Number)
  const date = new Date(year, month - 1, day)

  return date.toLocaleDateString('pt-BR')
}

function getBirthdayShort(dateString: string | null) {
  if (!dateString) return null

  const [, month, day] = dateString.split('-')
  return `${day}/${month}`
}

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, '')
}

function buildWhatsAppLink(phone: string) {
  const normalized = normalizePhone(phone)

  if (!normalized) return '#'

  const phoneWithCountry = normalized.startsWith('55')
    ? normalized
    : `55${normalized}`

  return `https://wa.me/${phoneWithCountry}`
}

export default function ClientesPage() {
  const router = useRouter()
  const { showToast } = useToast()

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
      showToast('Erro ao carregar clientes', 'error')
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
    const phoneTerm = normalizePhone(search)

    if (!term) return clients

    return clients.filter((client) => {
      const phone = client.telefone_normalizado ?? normalizePhone(client.telefone)

      return (
        client.nome.toLowerCase().includes(term) ||
        client.telefone.toLowerCase().includes(term) ||
        phone.includes(phoneTerm) ||
        client.email?.toLowerCase().includes(term)
      )
    })
  }, [clients, search])

  const activeClients = clients.filter((client) => client.ativo).length
  const inactiveClients = clients.length - activeClients

  async function deactivateClient(id: string) {
    const confirmDelete = confirm('Deseja inativar este cliente?')

    if (!confirmDelete) return

    const { error } = await supabase
      .from('clients')
      .update({ ativo: false })
      .eq('id', id)

    if (error) {
      showToast(error.message, 'error')
      return
    }

    showToast('Cliente inativado com sucesso', 'success')
    await loadClients()
  }

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <main className="clientes-shell">
      <Sidebar />

      <section className="clientes-main">
        <Header profile={profile} />

        <div className="clientes-toolbar clientes-toolbar-compact">
          <div>
            <p className="clientes-eyebrow">Base global</p>
            <h2>Clientes</h2>
            <span>
              {activeClients} ativos · {inactiveClients} inativos
            </span>
          </div>

          <button
            className="primary-button"
            type="button"
            onClick={() => {
              setSelectedClient(null)
              setModalOpen(true)
            }}
          >
            Novo cliente
          </button>
        </div>

        <section className="clientes-panel clientes-panel-compact">
          <div className="clientes-panel-header clientes-search-card">
            <div className="clientes-search-wrapper">
              <span>Buscar</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nome, telefone ou e-mail"
              />
            </div>

            <strong>
              {filteredClients.length}{' '}
              {filteredClients.length === 1 ? 'cliente' : 'clientes'}
            </strong>
          </div>

          {filteredClients.length === 0 ? (
            <div className="clientes-empty">
              <h3>Nenhum cliente encontrado</h3>
              <p>Cadastre seu primeiro cliente para começar os agendamentos.</p>
            </div>
          ) : (
            <div className="clientes-list">
              <div className="clientes-table-head clientes-desktop-only">
                <span>Nome</span>
                <span>Telefone</span>
                <span>Nascimento</span>
                <span>Status</span>
                <span>Ações</span>
              </div>

              {filteredClients.map((client) => {
                const birthday = getBirthdayShort(client.data_nascimento)

                return (
                  <article className="cliente-card" key={client.id}>
                    <div className="cliente-main-info">
                      <div>
                        <strong>{client.nome}</strong>
                        <span>{client.telefone}</span>
                      </div>

                      <span
                        className={
                          client.ativo ? 'status-active' : 'status-inactive'
                        }
                      >
                        {client.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>

                    <div className="cliente-meta-grid">
                      <div>
                        <span>Nascimento</span>
                        <strong>{formatBirthDate(client.data_nascimento)}</strong>
                      </div>
                    </div>

                    <div className="clientes-actions">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedClient(client)
                          setModalOpen(true)
                        }}
                      >
                        Editar
                      </button>

                      <a
                        href={buildWhatsAppLink(client.telefone)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        WhatsApp
                      </a>

                      {client.ativo ? (
                        <button
                          type="button"
                          className="danger-action"
                          onClick={() => deactivateClient(client.id)}
                        >
                          Inativar
                        </button>
                      ) : null}
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </section>

      <ClientModal
        open={modalOpen}
        client={selectedClient}
        onClose={() => setModalOpen(false)}
        onSaved={async () => {
          await loadClients()
          showToast('Cliente salvo com sucesso', 'success')
        }}
      />
    </main>
  )
}