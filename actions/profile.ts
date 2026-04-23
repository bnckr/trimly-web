import { supabase } from '../lib/supabase'
import { requireUser } from '../lib/auth'

export async function getMyProfile() {
  const user = await requireUser()

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) throw error
  return data
}

export async function updateMyProfile(input: {
  nome?: string
  telefone?: string | null
  especialidade?: string | null
  cor_agenda?: string | null
  intervalo_padrao_minutos?: number
  observacoes?: string | null
}) {
  const user = await requireUser()

  const { data, error } = await supabase
    .from('profiles')
    .update(input)
    .eq('id', user.id)
    .select()
    .single()

  if (error) throw error
  return data
}