'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { ServiceModal } from '@/components/servicos/service-modal'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useToast } from '@/components/ui/toast-provider'

type Profile = {
  nome: string
  email: string | null
  avatar_url: string | null
}

type Service = {
  id: string
  nome: string
  valor: number
  duracao_minutos: number
  ativo: boolean
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export default function ServicosPage() {
  const router = useRouter()
  const { showToast } = useToast()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [search, setSearch] = useState('')
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  async function loadServices() {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .order('nome', { ascending: true })

    if (error) {
      console.error(error)
      showToast('Erro ao carregar serviços', 'error')
      return
    }

    setServices((data ?? []) as Service[])
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

      await loadServices()
      setLoading(false)
    }

    loadPage()
  }, [router])

  const filteredServices = useMemo(() => {
    const term = search.toLowerCase().trim()

    if (!term) return services

    return services.filter((service) =>
      service.nome.toLowerCase().includes(term),
    )
  }, [services, search])

  const activeServices = services.filter((service) => service.ativo).length

  async function deactivateService(id: string) {
    const confirmDelete = confirm('Deseja inativar este serviço?')

    if (!confirmDelete) return

    const { error } = await supabase
      .from('services')
      .update({ ativo: false })
      .eq('id', id)

    if (error) {
      showToast(error.message, 'error')
      return
    }

    showToast('Serviço inativado com sucesso', 'success')
    await loadServices()
  }

  function openCreateModal() {
    setSelectedService(null)
    setModalOpen(true)
  }

  function openEditModal(service: Service) {
    setSelectedService(service)
    setModalOpen(true)
  }

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <main className="servicos-shell">
      <Sidebar />

      <section className="servicos-main">
        <Header profile={profile} />

        <div className="servicos-toolbar">
          <div>
            <p className="servicos-eyebrow">Catálogo</p>
            <h2>Serviços</h2>
            <span>
              {activeServices} ativos · {services.length} cadastrados
            </span>
          </div>

          <button className="primary-button" onClick={openCreateModal}>
            Novo serviço
          </button>
        </div>

        <section className="servicos-panel">
          <div className="servicos-panel-header">
            <div className="servicos-search">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar serviço..."
              />

              {search ? (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  aria-label="Limpar busca"
                >
                  ×
                </button>
              ) : null}
            </div>

            <span>
              {filteredServices.length}{' '}
              {filteredServices.length === 1 ? 'serviço' : 'serviços'}
            </span>
          </div>

          {filteredServices.length === 0 ? (
            <div className="servicos-empty">
              <h3>Nenhum serviço encontrado</h3>
              <p>Cadastre seu primeiro serviço para liberar agendamentos.</p>
            </div>
          ) : (
            <div className="servicos-table">
              <div className="servicos-table-head">
                <span>Serviço</span>
                <span>Valor</span>
                <span>Duração</span>
                <span>Status</span>
                <span>Ações</span>
              </div>

              {filteredServices.map((service) => (
                <article className="servicos-table-row" key={service.id}>
                  <div className="servico-name">
                    <strong>{service.nome}</strong>
                    <small>
                      {formatCurrency(Number(service.valor))} ·{' '}
                      {service.duracao_minutos} min
                    </small>
                  </div>

                  <span className="desktop-only">
                    {formatCurrency(Number(service.valor))}
                  </span>

                  <span className="desktop-only">
                    {service.duracao_minutos} min
                  </span>

                  <span
                    className={
                      service.ativo ? 'status-active' : 'status-inactive'
                    }
                  >
                    {service.ativo ? 'Ativo' : 'Inativo'}
                  </span>

                  <div className="servicos-actions">
                    <button onClick={() => openEditModal(service)}>
                      Editar
                    </button>

                    {service.ativo ? (
                      <button onClick={() => deactivateService(service.id)}>
                        Inativar
                      </button>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>

      <ServiceModal
        open={modalOpen}
        service={selectedService}
        onClose={() => setModalOpen(false)}
        onSaved={async () => {
          await loadServices()
          setModalOpen(false)
        }}
      />
    </main>
  )
}
