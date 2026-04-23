export type Profile = {
  id: string
  nome: string
  email: string | null
  telefone: string | null
  especialidade: string | null
  cor_agenda: string | null
  intervalo_padrao_minutos: number
  observacoes: string | null
  ativo: boolean
  created_at: string
  updated_at: string
}