export type Client = {
  id: string
  nome: string
  telefone: string
  telefone_normalizado?: string
  data_nascimento: string | null
  email: string | null
  observacoes: string | null
  preferencias: string | null
  origem_cliente: string | null
  ativo: boolean
  created_at: string
  updated_at: string
}

export type CreateClientInput = {
  nome: string
  telefone: string
  data_nascimento?: string | null
  email?: string | null
  observacoes?: string | null
  preferencias?: string | null
  origem_cliente?: string | null
  ativo?: boolean
}

export type UpdateClientInput = Partial<CreateClientInput>