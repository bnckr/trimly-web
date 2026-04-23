export type AppointmentStatus =
  | 'agendado'
  | 'confirmado'
  | 'em_atendimento'
  | 'finalizado'
  | 'cancelado'
  | 'faltou'

export type Appointment = {
  id: string
  profissional_id: string
  cliente_id: string
  servico_id: string
  cupom_id: string | null
  cupom_codigo_informado: string | null
  desconto_percentual: number
  valor_original: number
  valor_final: number
  status: AppointmentStatus
  observacoes: string | null
  encaixe: boolean
  cliente_atrasado: boolean
  data_agendamento: string
  hora_inicio: string
  hora_fim: string
  created_by: string | null
  created_at: string
  updated_at: string
}

export type CreateAppointmentInput = {
  cliente_id: string
  servico_id: string
  cupom_codigo_informado?: string | null
  data_agendamento: string
  hora_inicio: string
  observacoes?: string | null
  status?: AppointmentStatus
  encaixe?: boolean
  cliente_atrasado?: boolean
}

export type UpdateAppointmentInput = Partial<CreateAppointmentInput>