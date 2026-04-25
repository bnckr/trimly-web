import { supabase } from '../lib/supabase'
import { requireUser } from '../lib/auth'

export async function getMyFinancialReport(startDate: string, endDate: string) {
  const user = await requireUser()

  const { data, error } = await supabase
    .from('financial_entries')
    .select('*')
    .eq('profissional_id', user.id)
    .gte('created_at', `${startDate}T00:00:00`)
    .lte('created_at', `${endDate}T23:59:59`)

  if (error) throw error

  const entries = data ?? []

  return {
    totalLancamentos: entries.length,
    valorBrutoTotal: entries.reduce(
      (acc, item) => acc + Number(item.valor_bruto ?? 0),
      0,
    ),
    descontoTotal: entries.reduce(
      (acc, item) => acc + Number(item.desconto ?? 0),
      0,
    ),
    valorLiquidoTotal: entries.reduce(
      (acc, item) => acc + Number(item.valor_liquido ?? 0),
      0,
    ),
    comissaoTotal: entries.reduce(
      (acc, item) => acc + Number(item.comissao_valor ?? 0),
      0,
    ),
  }
}

export async function getMyDashboardReport(startDate: string, endDate: string) {
  const user = await requireUser()

  const { data, error } = await supabase
    .from('appointments')
    .select(`
      id,
      status,
      valor_original,
      desconto_percentual,
      valor_final,
      data_agendamento,
      services(nome),
      clients(nome),
      appointment_payments(
        valor_bruto,
        taxa_valor,
        valor_liquido_colaborador,
        forma_pagamento
      )
    `)
    .eq('profissional_id', user.id)
    .gte('data_agendamento', startDate)
    .lte('data_agendamento', endDate)

  if (error) throw error

  const appointments = data ?? []
  const finalizados = appointments.filter(
    (item) => item.status === 'finalizado',
  )

  const faturamentoBruto = finalizados.reduce((acc, item) => {
    return acc + Number(item.valor_original ?? item.valor_final ?? 0)
  }, 0)

  const descontos = finalizados.reduce((acc, item) => {
    const original = Number(item.valor_original ?? item.valor_final ?? 0)
    const final = Number(item.valor_final ?? 0)

    return acc + Math.max(original - final, 0)
  }, 0)

  const taxas = finalizados.reduce((acc, item) => {
    const payment = Array.isArray(item.appointment_payments)
      ? item.appointment_payments[0]
      : item.appointment_payments

    return acc + Number(payment?.taxa_valor ?? 0)
  }, 0)

  const faturamentoLiquido = finalizados.reduce((acc, item) => {
    const payment = Array.isArray(item.appointment_payments)
      ? item.appointment_payments[0]
      : item.appointment_payments

    return (
      acc +
      Number(payment?.valor_liquido_colaborador ?? item.valor_final ?? 0)
    )
  }, 0)

  const totalAtendimentos = appointments.length
  const totalFinalizados = finalizados.length
  const totalCancelados = appointments.filter(
    (item) => item.status === 'cancelado',
  ).length
  const totalFaltas = appointments.filter(
    (item) => item.status === 'faltou',
  ).length

  return {
    faturamentoBruto,
    faturamentoLiquido,
    descontos,
    taxas,
    totalAtendimentos,
    totalFinalizados,
    totalCancelados,
    totalFaltas,
    taxaCancelamento:
      totalAtendimentos > 0
        ? Number(((totalCancelados / totalAtendimentos) * 100).toFixed(2))
        : 0,
    taxaFalta:
      totalAtendimentos > 0
        ? Number(((totalFaltas / totalAtendimentos) * 100).toFixed(2))
        : 0,
    ticketMedio:
      totalFinalizados > 0
        ? Number((faturamentoLiquido / totalFinalizados).toFixed(2))
        : 0,
    appointments,
  }
}

export async function getAttendanceReport(startDate: string, endDate: string) {
  const user = await requireUser()

  const { data, error } = await supabase
    .from('appointments')
    .select('id, status, valor_final')
    .eq('profissional_id', user.id)
    .gte('data_agendamento', startDate)
    .lte('data_agendamento', endDate)

  if (error) throw error

  const appointments = data ?? []
  const total = appointments.length
  const cancelados = appointments.filter(
    (item) => item.status === 'cancelado',
  ).length
  const faltas = appointments.filter((item) => item.status === 'faltou').length
  const finalizados = appointments.filter(
    (item) => item.status === 'finalizado',
  ).length

  return {
    total,
    cancelados,
    faltas,
    finalizados,
    taxaCancelamento: total
      ? Number(((cancelados / total) * 100).toFixed(2))
      : 0,
    taxaFalta: total ? Number(((faltas / total) * 100).toFixed(2)) : 0,
  }
}

export async function getMostRequestedServices(limit = 10) {
  const user = await requireUser()

  const { data, error } = await supabase
    .from('appointments')
    .select('servico_id, services(nome)')
    .eq('profissional_id', user.id)
    .eq('status', 'finalizado')

  if (error) throw error

  const grouped = new Map<string, { nome: string; total: number }>()

  ;(data ?? []).forEach((item) => {
    const serviceId = item.servico_id
    const service = Array.isArray(item.services)
      ? item.services[0]
      : item.services

    if (!serviceId) return

    const current = grouped.get(serviceId) ?? {
      nome: service?.nome ?? 'Serviço',
      total: 0,
    }

    grouped.set(serviceId, {
      ...current,
      total: current.total + 1,
    })
  })

  return Array.from(grouped.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, limit)
}

export async function getFrequentClients(limit = 10) {
  const user = await requireUser()

  const { data, error } = await supabase
    .from('appointments')
    .select('cliente_id, clients(nome)')
    .eq('profissional_id', user.id)
    .eq('status', 'finalizado')

  if (error) throw error

  const grouped = new Map<string, { nome: string; total: number }>()

  ;(data ?? []).forEach((item) => {
    const clientId = item.cliente_id
    const client = Array.isArray(item.clients) ? item.clients[0] : item.clients

    if (!clientId) return

    const current = grouped.get(clientId) ?? {
      nome: client?.nome ?? 'Cliente',
      total: 0,
    }

    grouped.set(clientId, {
      ...current,
      total: current.total + 1,
    })
  })

  return Array.from(grouped.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, limit)
}

export async function getMostUsedCoupons(limit = 10) {
  const user = await requireUser()

  const { data, error } = await supabase
    .from('coupon_usages')
    .select('coupon_id, profissional_id, coupons(nome_cupom)')
    .eq('profissional_id', user.id)

  if (error) throw error

  const grouped = new Map<string, { nome_cupom: string; total: number }>()

  ;(data ?? []).forEach((item) => {
    const coupon = Array.isArray(item.coupons)
      ? item.coupons[0]
      : item.coupons

    if (!item.coupon_id) return

    const current = grouped.get(item.coupon_id) ?? {
      nome_cupom: coupon?.nome_cupom ?? 'Cupom',
      total: 0,
    }

    grouped.set(item.coupon_id, {
      ...current,
      total: current.total + 1,
    })
  })

  return Array.from(grouped.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, limit)
}