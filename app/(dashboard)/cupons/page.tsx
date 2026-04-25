'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { CouponModal } from '@/components/cupons/coupon-modal'
import { LoadingSpinner } from "@/components/ui/loading-spinner";
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

export default function CuponsPage() {
  const router = useRouter()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [search, setSearch] = useState('')
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  async function loadCoupons() {
    const data = await listCoupons()
    setCoupons((data ?? []) as Coupon[])
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

    return coupons.filter((coupon) =>
      coupon.nome_cupom.toLowerCase().includes(term)
    )
  }, [coupons, search])

  async function handleToggleCoupon(coupon: Coupon) {
    const message = coupon.ativo
      ? 'Deseja inativar este cupom?'
      : 'Deseja ativar este cupom?'

    const confirmed = confirm(message)

    if (!confirmed) return

    try {
      if (coupon.ativo) {
        await deactivateCoupon(coupon.id)
      } else {
        await activateCoupon(coupon.id)
      }

      await loadCoupons()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erro ao alterar cupom.')
    }
  }

  if (loading) {
    return <LoadingSpinner />;
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
          </div>

          <button
            className="primary-button"
            onClick={() => {
              setSelectedCoupon(null)
              setModalOpen(true)
            }}
          >
            Novo cupom
          </button>
        </div>

        <section className="cupons-panel">
          <div className="cupons-panel-header">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome do cupom..."
            />

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
                <div className="cupons-table-row" key={coupon.id}>
                  <strong>{coupon.nome_cupom}</strong>

                  <span>{coupon.percentual_desconto}%</span>

                  <span>
                    {coupon.validade_inicial || coupon.validade_final
                      ? `${formatDate(coupon.validade_inicial)} até ${formatDate(
                          coupon.validade_final
                        )}`
                      : 'Sem validade'}
                  </span>

                  <span>
                    {coupon.uso_aniversario ? 'Aniversário' : 'Geral'}
                  </span>

                  <span
                    className={
                      coupon.ativo ? 'status-active' : 'status-inactive'
                    }
                  >
                    {coupon.ativo ? 'Ativo' : 'Inativo'}
                  </span>

                  <div className="cupons-actions">
                    <button
                      onClick={() => {
                        setSelectedCoupon(coupon)
                        setModalOpen(true)
                      }}
                    >
                      Editar
                    </button>

                    <button onClick={() => handleToggleCoupon(coupon)}>
                      {coupon.ativo ? 'Inativar' : 'Ativar'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </section>

      <CouponModal
        open={modalOpen}
        coupon={selectedCoupon}
        onClose={() => setModalOpen(false)}
        onSaved={loadCoupons}
      />
    </main>
  )
}