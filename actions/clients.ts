import { supabase } from '../lib/supabase'
import { normalizePhone } from '../lib/utils'
import { validateRequiredString } from '../lib/validations'
import type { CreateClientInput, UpdateClientInput } from '../types/client'

export async function listClients() {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('nome', { ascending: true })

  if (error) throw error
  return data
}

export async function searchClients(search: string) {
  const normalized = normalizePhone(search)

  let query = supabase
    .from('clients')
    .select('*')
    .eq('ativo', true)
    .limit(10)

  if (normalized) {
    query = query.or(`nome.ilike.%${search}%,telefone_normalizado.like.%${normalized}%`)
  } else {
    query = query.ilike('nome', `%${search}%`)
  }

  const { data, error } = await query.order('nome', { ascending: true })

  if (error) throw error
  return data
}

export async function getClientById(id: string) {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function createClient(input: CreateClientInput) {
  validateRequiredString(input.nome, 'Nome')
  validateRequiredString(input.telefone, 'Telefone')

  const { data, error } = await supabase
    .from('clients')
    .insert({
      nome: input.nome.trim(),
      telefone: input.telefone.trim(),
      data_nascimento: input.data_nascimento ?? null,
      email: input.email ?? null,
      observacoes: input.observacoes ?? null,
      preferencias: input.preferencias ?? null,
      origem_cliente: input.origem_cliente ?? null,
      ativo: input.ativo ?? true,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateClient(id: string, input: UpdateClientInput) {
  const payload = {
    ...(input.nome !== undefined ? { nome: input.nome.trim() } : {}),
    ...(input.telefone !== undefined ? { telefone: input.telefone.trim() } : {}),
    ...(input.data_nascimento !== undefined ? { data_nascimento: input.data_nascimento } : {}),
    ...(input.email !== undefined ? { email: input.email } : {}),
    ...(input.observacoes !== undefined ? { observacoes: input.observacoes } : {}),
    ...(input.preferencias !== undefined ? { preferencias: input.preferencias } : {}),
    ...(input.origem_cliente !== undefined ? { origem_cliente: input.origem_cliente } : {}),
    ...(input.ativo !== undefined ? { ativo: input.ativo } : {}),
  }

  const { data, error } = await supabase
    .from('clients')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deactivateClient(id: string) {
  return updateClient(id, { ativo: false })
}

export async function getClientHistory(clientId: string) {
  const { data, error } = await supabase
    .from('v_appointments_detailed')
    .select('*')
    .eq('cliente_id', clientId)
    .order('data_agendamento', { ascending: false })
    .order('hora_inicio', { ascending: false })

  if (error) throw error
  return data
}