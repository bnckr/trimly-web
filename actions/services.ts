import { supabase } from '../lib/supabase'
import { validatePositiveNumber, validateRequiredString } from '../lib/validations'
import type { CreateServiceInput, UpdateServiceInput } from '../types/service'

export async function listServices() {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .order('nome', { ascending: true })

  if (error) throw error
  return data
}

export async function getServiceById(id: string) {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function createService(input: CreateServiceInput) {
  validateRequiredString(input.nome, 'Nome do serviço')
  validatePositiveNumber(input.valor, 'Valor')

  const { data, error } = await supabase
    .from('services')
    .insert({
      nome: input.nome.trim(),
      valor: input.valor,
      duracao_minutos: input.duracao_minutos,
      ativo: input.ativo ?? true,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateService(id: string, input: UpdateServiceInput) {
  const { data, error } = await supabase
    .from('services')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deactivateService(id: string) {
  return updateService(id, { ativo: false })
}