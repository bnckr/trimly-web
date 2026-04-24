export type PaymentMethod =
  | 'dinheiro'
  | 'pix'
  | 'debito'
  | 'credito'
  | 'credito_parcelado'
  | 'cortesia'

export type AppointmentPayment = {
  id: string
  appointment_id: string
  cliente_id: string
  profissional_id: string
  forma_pagamento: PaymentMethod
  valor_bruto: number
  taxa_percentual: number
  taxa_valor: number
  valor_liquido_colaborador: number
  valor_taxa_empresa: number
  parcelas: number | null
  observacoes: string | null
  pago_em: string
  created_at: string
  updated_at: string
}

export type UpsertAppointmentPaymentInput = {
  appointment_id: string
  cliente_id: string
  profissional_id: string
  forma_pagamento: PaymentMethod
  valor_bruto: number
  taxa_percentual?: number
  parcelas?: number | null
  observacoes?: string | null
}