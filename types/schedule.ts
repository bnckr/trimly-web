export type ProfessionalSchedule = {
  id: string
  profissional_id: string
  dia_semana: number
  hora_inicio: string
  hora_fim: string
  intervalo_inicio?: string | null
  intervalo_fim?: string | null
  ativo: boolean
}