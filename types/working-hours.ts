export type WorkingHour = {
  id: string
  profissional_id: string
  dia_semana: number
  hora_inicio: string
  hora_fim: string
  ativo: boolean
  created_at?: string
  updated_at?: string
}

export type BreakTime = {
  id: string
  profissional_id: string
  dia_semana: number
  hora_inicio: string
  hora_fim: string
  motivo: string | null
  ativo: boolean
  created_at?: string
  updated_at?: string
}