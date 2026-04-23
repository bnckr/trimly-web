export type Service = {
  id: string
  nome: string
  valor: number
  duracao_minutos: number
  ativo: boolean
  created_at: string
  updated_at: string
}

export type CreateServiceInput = {
  nome: string
  valor: number
  duracao_minutos: number
  ativo?: boolean
}

export type UpdateServiceInput = Partial<CreateServiceInput>