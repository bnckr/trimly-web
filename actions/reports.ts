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
    valorBrutoTotal: entries.reduce((acc, item) => acc + Number(item.valor_bruto), 0),
    descontoTotal: entries.reduce((acc, item) => acc + Number(item.desconto), 0),
    valorLiquidoTotal: entries.reduce((acc, item) => acc + Number(item.valor_liquido), 0),
    comissaoTotal: entries.reduce((acc, item) => acc + Number(item.comissao_valor), 0),
  }
}

export async function getAttendanceReport(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('appointments')
    .select('id, status, valor_final')
    .gte('data_agendamento', startDate)
    .lte('data_agendamento', endDate)

  if (error) throw error

  const appointments = data ?? []
  const total = appointments.length
  const cancelados = appointments.filter((item) => item.status === 'cancelado').length
  const faltas = appointments.filter((item) => item.status === 'faltou').length
  const finalizados = appointments.filter((item) => item.status === 'finalizado').length

  return {
    total,
    cancelados,
    faltas,
    finalizados,
    taxaCancelamento: total ? Number(((cancelados / total) * 100).toFixed(2)) : 0,
    taxaFalta: total ? Number(((faltas / total) * 100).toFixed(2)) : 0,
  }
}

export async function getMostRequestedServices() {
  const { data, error } = await supabase
    .from('v_servicos_mais_realizados')
    .select('*')

  if (error) throw error
  return data
}

export async function getFrequentClients(limit = 10) {
  const { data, error } = await supabase
    .from('v_clientes_frequentes')
    .select('*')
    .limit(limit)

  if (error) throw error
  return data
}

export async function getMostUsedCoupons() {
  const { data, error } = await supabase
    .from('coupon_usages')
    .select('coupon_id, coupons(nome_cupom)')

  if (error) throw error
  return data
}