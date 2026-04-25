'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { CouponModal } from '@/components/cupons/coupon-modal'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useToast } from '@/components/ui/toast-provider'
import {
  activateCoupon,
  deactivateCoupon,
  listCoupons,
} from '@/actions/coupons'
import type { Coupon } from '@/types/coupon'
import './cupons.css'

type Profile = {
  nome: string
  email: string | null
  avatar_url: string | null
}

function formatDate(date: string | null) {
  if (!date) return '-'

  const [year, month, day] = date.split('-').map(Number)

  return new Date(year, month - 1, day).toLocaleDateString('pt-BR')
}

function getValidityLabel(coupon: Coupon) {
  if (!coupon.validade_inicial && !coupon.validade_final) {
    return 'Sem validade'
  }

  if (coupon.validade_inicial && coupon.validade_final) {
    return `${formatDate(coupon.validade_inicial)} até ${formatDate(
      coupon.validade_final,
    )}`
  }

  if (coupon.validade_inicial) {
    return `A partir de ${formatDate(coupon.validade_inicial)}`
  }

  return `Até ${formatDate(coupon.validade_final)}`
}

function getCouponLimitLabel(limit: number | null) {
  if (!limit) return 'Uso ilimitado'
  return `${limit} uso${limit === 1 ? '' : 's'}`
}

export default function CuponsPage() {
  const router = useRouter()
  const { showToast } = useToast()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [search, setSearch] = useState('')
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  async function loadCoupons() {
    try {
      const data = await listCoupons()
      setCoupons((data ?? []) as Coupon[])
    } catch (error) {
      console.error(error)
      showToast('Erro ao carregar cupons', 'error')
    }
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

      await loadCoupons()
      setLoading(false)
    }

    loadPage()
  }, [router])

  const filteredCoupons = useMemo(() => {
    const term = search.toLowerCase().trim()

    if (!term) return coupons

    return coupons.filter((coupon) => {
      const type = coupon.uso_aniversario ? 'aniversario aniversário' : 'geral'

      return (
        coupon.nome_cupom.toLowerCase().includes(term) ||
        type.includes(term) ||
        String(coupon.percentual_desconto).includes(term)
      )
    })
  }, [coupons, search])

  const activeCoupons = coupons.filter((coupon) => coupon.ativo).length
  const birthdayCoupons = coupons.filter((coupon) => coupon.uso_aniversario).length

  async function handleToggleCoupon(coupon: Coupon) {
    const message = coupon.ativo
      ? 'Deseja inativar este cupom?'
      : 'Deseja ativar este cupom?'

    const confirmed = confirm(message)

    if (!confirmed) return

    try {
      if (coupon.ativo) {
        await deactivateCoupon(coupon.id)
        showToast('Cupom inativado com sucesso', 'success')
      } else {
        await activateCoupon(coupon.id)
        showToast('Cupom ativado com sucesso', 'success')
      }

      await loadCoupons()
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Erro ao alterar cupom.',
        'error',
      )
    }
  }

  function openCreateModal() {
    setSelectedCoupon(null)
    setModalOpen(true)
  }

  function openEditModal(coupon: Coupon) {
    setSelectedCoupon(coupon)
    setModalOpen(true)
  }

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <main className="cupons-shell">
      <Sidebar />

      <section className="cupons-main">
        <Header profile={profile} />

        <div className="cupons-toolbar">
          <div>
            <p className="cupons-eyebrow">Campanhas e descontos</p>
            <h2>Cupons</h2>
            <span>
              {activeCoupons} ativos · {birthdayCoupons} de aniversário ·{' '}
              {coupons.length} cadastrados
            </span>
          </div>

          <button className="primary-button" onClick={openCreateModal}>
            Novo cupom
          </button>
        </div>

        <section className="cupons-panel">
          <div className="cupons-panel-header">
            <div className="cupons-search">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar cupom, tipo ou desconto..."
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
              {filteredCoupons.length}{' '}
              {filteredCoupons.length === 1 ? 'cupom' : 'cupons'}
            </span>
          </div>

          {filteredCoupons.length === 0 ? (
            <div className="cupons-empty">
              <h3>Nenhum cupom encontrado</h3>
              <p>Crie cupons para aplicar descontos nos agendamentos.</p>
            </div>
          ) : (
            <div className="cupons-table">
              <div className="cupons-table-head">
                <span>Cupom</span>
                <span>Desconto</span>
                <span>Validade</span>
                <span>Tipo</span>
                <span>Status</span>
                <span>Ações</span>
              </div>

              {filteredCoupons.map((coupon) => (
                <article className="cupons-table-row" key={coupon.id}>
                  <div className="coupon-main-info">
                    <strong>{coupon.nome_cupom}</strong>

                    <div className="coupon-mobile-meta">
                      <span>{coupon.percentual_desconto}% de desconto</span>
                      <span>{getValidityLabel(coupon)}</span>
                    </div>
                  </div>

                  <span className="desktop-only">
                    {coupon.percentual_desconto}%
                  </span>

                  <span className="desktop-only">{getValidityLabel(coupon)}</span>

                  <div className="coupon-badges">
                    <span
                      className={
                        coupon.uso_aniversario
                          ? 'coupon-type-badge birthday'
                          : 'coupon-type-badge'
                      }
                    >
                      {coupon.uso_aniversario ? 'Aniversário' : 'Geral'}
                    </span>

                    <small>{getCouponLimitLabel(coupon.quantidade_maxima_uso)}</small>
                  </div>

                  <span
                    className={coupon.ativo ? 'status-active' : 'status-inactive'}
                  >
                    {coupon.ativo ? 'Ativo' : 'Inativo'}
                  </span>

                  <div className="cupons-actions">
                    <button onClick={() => openEditModal(coupon)}>
                      Editar
                    </button>

                    <button onClick={() => handleToggleCoupon(coupon)}>
                      {coupon.ativo ? 'Inativar' : 'Ativar'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>

      <CouponModal
        open={modalOpen}
        coupon={selectedCoupon}
        onClose={() => setModalOpen(false)}
        onSaved={async () => {
          await loadCoupons()
          setModalOpen(false)
        }}
      />
    </main>
  )
}
