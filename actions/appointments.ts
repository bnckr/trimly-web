import { supabase } from '../lib/supabase'
import { requireUser } from '../lib/auth'
import type { CreateAppointmentInput, UpdateAppointmentInput, AppointmentStatus } from '../types/appointment'

export async function listMyAppointments(date?: string) {
  const user = await requireUser()

  let query = supabase
    .from('v_appointments_detailed')
    .select('*')
    .eq('profissional_id', user.id)
    .order('data_agendamento', { ascending: true })
    .order('hora_inicio', { ascending: true })

  if (date) {
    query = query.eq('data_agendamento', date)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function listAppointmentsByProfessional(profissionalId: string, startDate?: string, endDate?: string) {
  let query = supabase
    .from('v_appointments_detailed')
    .select('*')
    .eq('profissional_id', profissionalId)
    .order('data_agendamento', { ascending: true })
    .order('hora_inicio', { ascending: true })

  if (startDate) query = query.gte('data_agendamento', startDate)
  if (endDate) query = query.lte('data_agendamento', endDate)

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getAppointmentById(id: string) {
  const { data, error } = await supabase
    .from('v_appointments_detailed')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function createAppointment(input: CreateAppointmentInput) {
  const user = await requireUser()

  const { data, error } = await supabase
    .from('appointments')
    .insert({
      profissional_id: user.id,
      cliente_id: input.cliente_id,
      servico_id: input.servico_id,
      cupom_codigo_informado: input.cupom_codigo_informado ?? null,
      data_agendamento: input.data_agendamento,
      hora_inicio: input.hora_inicio,
      observacoes: input.observacoes ?? null,
      status: input.status ?? 'agendado',
      encaixe: input.encaixe ?? false,
      cliente_atrasado: input.cliente_atrasado ?? false,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateAppointment(id: string, input: UpdateAppointmentInput) {
  const user = await requireUser()

  const { data, error } = await supabase
    .from('appointments')
    .update({
      ...(input.cliente_id !== undefined ? { cliente_id: input.cliente_id } : {}),
      ...(input.servico_id !== undefined ? { servico_id: input.servico_id } : {}),
      ...(input.cupom_codigo_informado !== undefined ? { cupom_codigo_informado: input.cupom_codigo_informado } : {}),
      ...(input.data_agendamento !== undefined ? { data_agendamento: input.data_agendamento } : {}),
      ...(input.hora_inicio !== undefined ? { hora_inicio: input.hora_inicio } : {}),
      ...(input.observacoes !== undefined ? { observacoes: input.observacoes } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.encaixe !== undefined ? { encaixe: input.encaixe } : {}),
      ...(input.cliente_atrasado !== undefined ? { cliente_atrasado: input.cliente_atrasado } : {}),
    })
    .eq('id', id)
    .eq('profissional_id', user.id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateAppointmentStatus(id: string, status: AppointmentStatus) {
  return updateAppointment(id, { status })
}

export async function deleteAppointment(id: string) {
  const user = await requireUser()

  const { error } = await supabase
    .from('appointments')
    .delete()
    .eq('id', id)
    .eq('profissional_id', user.id)

  if (error) throw error
  return true
}

export async function cancelAppointment(id: string) {
  return updateAppointmentStatus(id, 'cancelado')
}