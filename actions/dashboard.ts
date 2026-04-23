import { supabase } from '../lib/supabase'
import { requireUser } from '../lib/auth'

export async function getDashboardSummary(date: string) {
  const user = await requireUser()

  const { data, error } = await supabase
    .from('appointments')
    .select('id, status, valor_final')
    .eq('profissional_id', user.id)
    .eq('data_agendamento', date)

  if (error) throw error

  const appointments = data ?? []

  const totalAtendimentos = appointments.filter((item) =>
    ['agendado', 'confirmado', 'em_atendimento', 'finalizado'].includes(item.status)
  ).length

  const totalCancelados = appointments.filter((item) => item.status === 'cancelado').length
  const totalFaltas = appointments.filter((item) => item.status === 'faltou').length
  const faturamentoPrevisto = appointments
    .filter((item) => ['agendado', 'confirmado', 'em_atendimento', 'finalizado'].includes(item.status))
    .reduce((acc, item) => acc + Number(item.valor_final), 0)

  const faturamentoRealizado = appointments
    .filter((item) => item.status === 'finalizado')
    .reduce((acc, item) => acc + Number(item.valor_final), 0)

  return {
    totalAtendimentos,
    totalCancelados,
    totalFaltas,
    faturamentoPrevisto,
    faturamentoRealizado,
  }
}

export async function getTodayAgenda(date: string) {
  const user = await requireUser()

  const { data, error } = await supabase
    .from('v_agenda_unificada')
    .select('*')
    .eq('profissional_id', user.id)
    .eq('data_referencia', date)
    .order('hora_inicio', { ascending: true })

  if (error) throw error
  return data
}

export async function getUpcomingAppointmentsToday(date: string, currentTime: string) {
  const user = await requireUser()

  const { data, error } = await supabase
    .from('v_appointments_detailed')
    .select('*')
    .eq('profissional_id', user.id)
    .eq('data_agendamento', date)
    .in('status', ['agendado', 'confirmado', 'em_atendimento'])
    .gte('hora_inicio', currentTime)
    .order('hora_inicio', { ascending: true })
    .limit(5)

  if (error) throw error
  return data
}

export async function getBirthdayClientsOfMonth() {
  const { data, error } = await supabase
    .from('v_clientes_aniversariantes_mes')
    .select('*')
    .order('dia_aniversario', { ascending: true })
    .order('nome', { ascending: true })

  if (error) throw error
  return data
}