import { supabase } from '../lib/supabase'
import type {
  AppointmentPayment,
  PaymentMethod,
  UpsertAppointmentPaymentInput,
} from '../types/payment'

const DEFAULT_PAYMENT_FEES: Record<PaymentMethod, number> = {
  dinheiro: 0,
  pix: 0,
  debito: 1.99,
  credito: 4.98,
  credito_parcelado: 4.98,
  cortesia: 0,
}

export function getDefaultPaymentFee(method: PaymentMethod) {
  return DEFAULT_PAYMENT_FEES[method] ?? 0
}

export function calculatePaymentValues({
  valor_bruto,
  taxa_percentual,
}: {
  valor_bruto: number
  taxa_percentual: number
}) {
  const bruto = Number(valor_bruto || 0)
  const percentual = Number(taxa_percentual || 0)
  const taxaValor = Number(((bruto * percentual) / 100).toFixed(2))
  const liquido = Number((bruto - taxaValor).toFixed(2))

  return {
    valor_bruto: bruto,
    taxa_percentual: percentual,
    taxa_valor: taxaValor,
    valor_liquido_colaborador: liquido,
    valor_taxa_empresa: taxaValor,
  }
}

export async function getPaymentByAppointment(appointment_id: string) {
  const { data, error } = await supabase
    .from('appointment_payments')
    .select('*')
    .eq('appointment_id', appointment_id)
    .maybeSingle()

  if (error) throw error

  return data as AppointmentPayment | null
}

export async function upsertAppointmentPayment(
  input: UpsertAppointmentPaymentInput,
) {
  if (!input.appointment_id) {
    throw new Error('Agendamento não informado.')
  }

  if (!input.cliente_id) {
    throw new Error('Cliente não informado.')
  }

  if (!input.profissional_id) {
    throw new Error('Profissional não informado.')
  }

  if (input.valor_bruto < 0) {
    throw new Error('Valor do pagamento não pode ser negativo.')
  }

  const taxa =
    input.taxa_percentual ?? getDefaultPaymentFee(input.forma_pagamento)

  const calculated = calculatePaymentValues({
    valor_bruto: input.valor_bruto,
    taxa_percentual: taxa,
  })

  const payload = {
    appointment_id: input.appointment_id,
    cliente_id: input.cliente_id,
    profissional_id: input.profissional_id,
    forma_pagamento: input.forma_pagamento,
    valor_bruto: calculated.valor_bruto,
    taxa_percentual: calculated.taxa_percentual,
    taxa_valor: calculated.taxa_valor,
    valor_liquido_colaborador:
      calculated.valor_liquido_colaborador,
    valor_taxa_empresa: calculated.valor_taxa_empresa,
    parcelas:
      input.forma_pagamento === 'credito_parcelado'
        ? input.parcelas ?? 2
        : null,
    observacoes: input.observacoes ?? null,
    pago_em: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('appointment_payments')
    .upsert(payload, { onConflict: 'appointment_id' })
    .select()
    .single()

  if (error) throw error

  return data as AppointmentPayment
}

export async function deleteAppointmentPayment(appointment_id: string) {
  const { error } = await supabase
    .from('appointment_payments')
    .delete()
    .eq('appointment_id', appointment_id)

  if (error) throw error

  return true
}