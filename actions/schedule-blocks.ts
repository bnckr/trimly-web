import { supabase } from '../lib/supabase'
import { requireUser } from '../lib/auth'

export async function listMyScheduleBlocks(date?: string) {
  const user = await requireUser()

  let query = supabase
    .from('schedule_blocks')
    .select('*')
    .eq('profissional_id', user.id)
    .order('data_bloqueio', { ascending: true })
    .order('hora_inicio', { ascending: true })

  if (date) {
    query = query.eq('data_bloqueio', date)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function createScheduleBlock(input: {
  data_bloqueio: string
  hora_inicio: string
  hora_fim: string
  motivo?: string | null
}) {
  const user = await requireUser()

  const { data, error } = await supabase
    .from('schedule_blocks')
    .insert({
      profissional_id: user.id,
      data_bloqueio: input.data_bloqueio,
      hora_inicio: input.hora_inicio,
      hora_fim: input.hora_fim,
      motivo: input.motivo ?? null,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteScheduleBlock(id: string) {
  const user = await requireUser()

  const { error } = await supabase
    .from('schedule_blocks')
    .delete()
    .eq('id', id)
    .eq('profissional_id', user.id)

  if (error) throw error
  return true
}