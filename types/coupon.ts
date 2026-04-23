export type Coupon = {
  id: string
  nome_cupom: string
  percentual_desconto: number
  ativo: boolean
  uso_aniversario: boolean
  validade_inicial: string | null
  validade_final: string | null
  quantidade_maxima_uso: number | null
  created_at: string
  updated_at: string
}

export type CreateCouponInput = {
  nome_cupom: string
  percentual_desconto: number
  ativo?: boolean
  uso_aniversario?: boolean
  validade_inicial?: string | null
  validade_final?: string | null
  quantidade_maxima_uso?: number | null
}

export type UpdateCouponInput = Partial<CreateCouponInput>