import { supabase } from '../lib/supabase'
import { validatePercentage, validateRequiredString } from '../lib/validations'
import type { CreateCouponInput, UpdateCouponInput } from '../types/coupon'

export async function listCoupons() {
  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .order('nome_cupom', { ascending: true })

  if (error) throw error
  return data
}

export async function getCouponById(id: string) {
  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function createCoupon(input: CreateCouponInput) {
  validateRequiredString(input.nome_cupom, 'Nome do cupom')
  validatePercentage(input.percentual_desconto, 'Percentual de desconto')

  const { data, error } = await supabase
    .from('coupons')
    .insert({
      nome_cupom: input.nome_cupom.trim(),
      percentual_desconto: input.percentual_desconto,
      ativo: input.ativo ?? true,
      uso_aniversario: input.uso_aniversario ?? false,
      validade_inicial: input.validade_inicial ?? null,
      validade_final: input.validade_final ?? null,
      quantidade_maxima_uso: input.quantidade_maxima_uso ?? null,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateCoupon(id: string, input: UpdateCouponInput) {
  const { data, error } = await supabase
    .from('coupons')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deactivateCoupon(id: string) {
  return updateCoupon(id, { ativo: false })
}