import { supabase } from '../lib/supabase'
import { requireUser } from '../lib/auth'

export async function listMyWorkingHours() {
  const user = await requireUser()

  const { data, error } = await supabase
    .from('working_hours')
    .select('*')
    .eq('profissional_id', user.id)
    .order('dia_semana', { ascending: true })
    .order('hora_inicio', { ascending: true })

  if (error) throw error
  return data
}

export async function upsertWorkingHour(input: {
  id?: string
  dia_semana: number
  hora_inicio: string
  hora_fim: string
  ativo?: boolean
}) {
  const user = await requireUser()

  if (input.id) {
    const { data, error } = await supabase
      .from('working_hours')
      .update({
        dia_semana: input.dia_semana,
        hora_inicio: input.hora_inicio,
        hora_fim: input.hora_fim,
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
    .from('working_hours')
    .insert({
      profissional_id: user.id,
      dia_semana: input.dia_semana,
      hora_inicio: input.hora_inicio,
      hora_fim: input.hora_fim,
      ativo: input.ativo ?? true,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteWorkingHour(id: string) {
  const user = await requireUser()

  const { error } = await supabase
    .from('working_hours')
    .delete()
    .eq('id', id)
    .eq('profissional_id', user.id)

  if (error) throw error
  return true
}