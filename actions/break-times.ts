import { supabase } from '../lib/supabase'
import { requireUser } from '../lib/auth'

export async function listMyBreakTimes() {
  const user = await requireUser()

  const { data, error } = await supabase
    .from('break_times')
    .select('*')
    .eq('profissional_id', user.id)
    .order('dia_semana', { ascending: true })
    .order('hora_inicio', { ascending: true })

  if (error) throw error
  return data
}

export async function upsertBreakTime(input: {
  id?: string
  dia_semana: number
  hora_inicio: string
  hora_fim: string
  motivo?: string | null
  ativo?: boolean
}) {
  const user = await requireUser()

  if (input.id) {
    const { data, error } = await supabase
      .from('break_times')
      .update({
        dia_semana: input.dia_semana,
        hora_inicio: input.hora_inicio,
        hora_fim: input.hora_fim,
        motivo: input.motivo ?? null,
        ativo: input.ativo ?? true,
      })
      .eq('id', input.id)
      .eq('profissional_id', user.id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  const { data, error } = await supabase
    .from('break_times')
    .insert({
      profissional_id: user.id,
      dia_semana: input.dia_semana,
      hora_inicio: input.hora_inicio,
      hora_fim: input.hora_fim,
      motivo: input.motivo ?? null,
      ativo: input.ativo ?? true,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteBreakTime(id: string) {
  const user = await requireUser()

  const { error } = await supabase
    .from('break_times')
    .delete()
    .eq('id', id)
    .eq('profissional_id', user.id)

  if (error) throw error
  return true
}