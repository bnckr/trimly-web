import { supabase } from '../lib/supabase'
import {
  validatePercentage,
  validateRequiredString,
} from '../lib/validations'
import type {
  Coupon,
  CreateCouponInput,
  UpdateCouponInput,
} from '../types/coupon'

type ValidateCouponParams = {
  nome_cupom: string
  cliente_id: string
  servico_id: string
  data_agendamento: string
}

function normalizeCouponName(value: string) {
  return value.trim().toUpperCase()
}

function isDateBefore(dateA: string, dateB: string) {
  return new Date(`${dateA}T00:00:00`) < new Date(`${dateB}T00:00:00`)
}

function isDateAfter(dateA: string, dateB: string) {
  return new Date(`${dateA}T00:00:00`) > new Date(`${dateB}T00:00:00`)
}

export async function listCoupons() {
  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .order('nome_cupom', { ascending: true })

  if (error) throw error
  return data as Coupon[]
}

export async function getCouponById(id: string) {
  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as Coupon
}

export async function getCouponByName(nome_cupom: string) {
  const nome = normalizeCouponName(nome_cupom)

  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('nome_cupom', nome)
    .maybeSingle()

  if (error) throw error
  return data as Coupon | null
}

export async function createCoupon(input: CreateCouponInput) {
  validateRequiredString(input.nome_cupom, 'Nome do cupom')
  validatePercentage(input.percentual_desconto, 'Percentual de desconto')

  const nome = normalizeCouponName(input.nome_cupom)

  const existing = await getCouponByName(nome)

  if (existing) {
    throw new Error('Já existe um cupom com esse nome.')
  }

  if (
    input.validade_inicial &&
    input.validade_final &&
    isDateAfter(input.validade_inicial, input.validade_final)
  ) {
    throw new Error('A validade inicial não pode ser maior que a validade final.')
  }

  const { data, error } = await supabase
    .from('coupons')
    .insert({
      nome_cupom: nome,
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
  return data as Coupon
}

export async function updateCoupon(id: string, input: UpdateCouponInput) {
  const payload = { ...input }

  if (payload.nome_cupom !== undefined) {
    validateRequiredString(payload.nome_cupom, 'Nome do cupom')
    payload.nome_cupom = normalizeCouponName(payload.nome_cupom)

    const existing = await getCouponByName(payload.nome_cupom)

    if (existing && existing.id !== id) {
      throw new Error('Já existe outro cupom com esse nome.')
    }
  }

  if (payload.percentual_desconto !== undefined) {
    validatePercentage(payload.percentual_desconto, 'Percentual de desconto')
  }

  if (
    payload.validade_inicial &&
    payload.validade_final &&
    isDateAfter(payload.validade_inicial, payload.validade_final)
  ) {
    throw new Error('A validade inicial não pode ser maior que a validade final.')
  }

  const { data, error } = await supabase
    .from('coupons')
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Coupon
}

export async function deactivateCoupon(id: string) {
  return updateCoupon(id, { ativo: false })
}

export async function validateCouponForAppointment({
  nome_cupom,
  cliente_id,
  servico_id,
  data_agendamento,
}: ValidateCouponParams) {
  const nome = normalizeCouponName(nome_cupom)

  if (!nome) {
    throw new Error('Informe um cupom.')
  }

  const coupon = await getCouponByName(nome)

  if (!coupon || !coupon.ativo) {
    throw new Error('Cupom inválido ou inativo.')
  }

  if (
    coupon.validade_inicial &&
    isDateBefore(data_agendamento, coupon.validade_inicial)
  ) {
    throw new Error('Este cupom ainda não está válido.')
  }

  if (
    coupon.validade_final &&
    isDateAfter(data_agendamento, coupon.validade_final)
  ) {
    throw new Error('Este cupom expirou.')
  }

  if (coupon.uso_aniversario) {
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('data_nascimento')
      .eq('id', cliente_id)
      .single()

    if (clientError) throw clientError

    if (!client?.data_nascimento) {
      throw new Error('Este cliente não possui data de nascimento cadastrada.')
    }

    const birthMonth = new Date(`${client.data_nascimento}T00:00:00`).getMonth()
    const appointmentMonth = new Date(`${data_agendamento}T00:00:00`).getMonth()

    if (birthMonth !== appointmentMonth) {
      throw new Error('Este cupom é exclusivo para aniversariantes do mês.')
    }
  }

  if (coupon.quantidade_maxima_uso !== null) {
    const { count, error: countError } = await supabase
      .from('coupon_usages')
      .select('id', { count: 'exact', head: true })
      .eq('coupon_id', coupon.id)

    if (countError) throw countError

    if ((count ?? 0) >= coupon.quantidade_maxima_uso) {
      throw new Error('Este cupom atingiu o limite máximo de uso.')
    }
  }

  const { data: service, error: serviceError } = await supabase
    .from('services')
    .select('valor')
    .eq('id', servico_id)
    .single()

  if (serviceError) throw serviceError

  const valorOriginal = Number(service.valor)
  const descontoPercentual = Number(coupon.percentual_desconto)
  const valorDesconto = Number(
    ((valorOriginal * descontoPercentual) / 100).toFixed(2)
  )
  const valorFinal = Number((valorOriginal - valorDesconto).toFixed(2))

  return {
    coupon,
    valorOriginal,
    descontoPercentual,
    valorDesconto,
    valorFinal,
  }
}

export async function activateCoupon(id: string) {
  return updateCoupon(id, { ativo: true })
}

export async function registerCouponUsage({
  coupon_id,
  appointment_id,
  cliente_id,
  profissional_id,
}: {
  coupon_id: string
  appointment_id: string
  cliente_id: string
  profissional_id: string
}) {
  // Remove uso anterior (caso esteja editando)
  await supabase
    .from('coupon_usages')
    .delete()
    .eq('appointment_id', appointment_id)

  const { data, error } = await supabase
    .from('coupon_usages')
    .insert({
      coupon_id,
      appointment_id,
      cliente_id,
      profissional_id,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function removeCouponUsageByAppointment(appointment_id: string) {
  const { error } = await supabase
    .from('coupon_usages')
    .delete()
    .eq('appointment_id', appointment_id)

  if (error) throw error
  return true
}