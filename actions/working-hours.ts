import { supabase } from '../lib/supabase'
import { requireUser } from '../lib/auth'

function normalizeTime(time: string) {
  return time.slice(0, 5)
}

function timeToMinutes(time: string) {
  const [hours, minutes] = normalizeTime(time).split(':').map(Number)
  return hours * 60 + minutes
}

function isInsideRange(
  start: string,
  end: string,
  rangeStart: string,
  rangeEnd: string,
) {
  const startMin = timeToMinutes(start)
  const endMin = timeToMinutes(end)
  const rangeStartMin = timeToMinutes(rangeStart)
  const rangeEndMin = timeToMinutes(rangeEnd)

  return startMin >= rangeStartMin && endMin <= rangeEndMin
}

function hasRangeConflict(
  start: string,
  end: string,
  rangeStart: string,
  rangeEnd: string,
) {
  const startMin = timeToMinutes(start)
  const endMin = timeToMinutes(end)
  const rangeStartMin = timeToMinutes(rangeStart)
  const rangeEndMin = timeToMinutes(rangeEnd)

  return startMin < rangeEndMin && endMin > rangeStartMin
}

export async function listMyWorkingHours() {
  const user = await requireUser()

  const { data, error } = await supabase
    .from('working_hours')
    .select('*')
    .eq('profissional_id', user.id)
    .order('dia_semana', { ascending: true })
    .order('hora_inicio', { ascending: true })

  if (error) throw error
  return data
}

export async function upsertWorkingHour(input: {
  id?: string
  dia_semana: number
  hora_inicio: string
  hora_fim: string
  ativo?: boolean
}) {
  const user = await requireUser()

  if (timeToMinutes(input.hora_inicio) >= timeToMinutes(input.hora_fim)) {
    throw new Error('O horário inicial deve ser menor que o horário final.')
  }

  if (input.id) {
    const { data, error } = await supabase
      .from('working_hours')
      .update({
        dia_semana: input.dia_semana,
        hora_inicio: input.hora_inicio,
        hora_fim: input.hora_fim,
        ativo: input.ativo ?? true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.id)
      .eq('profissional_id', user.id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  const { data, error } = await supabase
    .from('working_hours')
    .insert({
      profissional_id: user.id,
      dia_semana: input.dia_semana,
      hora_inicio: input.hora_inicio,
      hora_fim: input.hora_fim,
      ativo: input.ativo ?? true,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteWorkingHour(id: string) {
  const user = await requireUser()

  const { error } = await supabase
    .from('working_hours')
    .delete()
    .eq('id', id)
    .eq('profissional_id', user.id)

  if (error) throw error
  return true
}

export async function listMyBreakTimes() {
  const user = await requireUser()

  const { data, error } = await supabase
    .from('break_times')
    .select('*')
    .eq('profissional_id', user.id)
    .eq('ativo', true)
    .order('dia_semana', { ascending: true })
    .order('hora_inicio', { ascending: true })

  if (error) throw error
  return data
}

export async function createBreakTime(input: {
  dia_semana: number
  hora_inicio: string
  hora_fim: string
  motivo?: string | null
}) {
  const user = await requireUser()

  if (timeToMinutes(input.hora_inicio) >= timeToMinutes(input.hora_fim)) {
    throw new Error('O início do intervalo deve ser menor que o fim.')
  }

  const { data, error } = await supabase
    .from('break_times')
    .insert({
      profissional_id: user.id,
      dia_semana: input.dia_semana,
      hora_inicio: input.hora_inicio,
      hora_fim: input.hora_fim,
      motivo: input.motivo ?? 'Intervalo',
      ativo: true,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteBreakTime(id: string) {
  const user = await requireUser()

  const { error } = await supabase
    .from('break_times')
    .delete()
    .eq('id', id)
    .eq('profissional_id', user.id)

  if (error) throw error
  return true
}

export async function validateAppointmentInsideWorkingHours({
  profissional_id,
  data_agendamento,
  hora_inicio,
  hora_fim,
}: {
  profissional_id: string
  data_agendamento: string
  hora_inicio: string
  hora_fim: string
}) {
  const [year, month, day] = data_agendamento.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  const diaSemana = date.getDay()

  const { data: workingHour, error: workingHourError } = await supabase
    .from('working_hours')
    .select('*')
    .eq('profissional_id', profissional_id)
    .eq('dia_semana', diaSemana)
    .eq('ativo', true)
    .maybeSingle()

  if (workingHourError) throw workingHourError

  if (!workingHour) {
    throw new Error('Este profissional não possui expediente ativo neste dia.')
  }

  const insideWorkingHours = isInsideRange(
    hora_inicio,
    hora_fim,
    workingHour.hora_inicio,
    workingHour.hora_fim,
  )

  if (!insideWorkingHours) {
    throw new Error(
      `Horário fora do expediente. Expediente do dia: ${normalizeTime(
        workingHour.hora_inicio,
      )} até ${normalizeTime(workingHour.hora_fim)}.`,
    )
  }

  const { data: breaks, error: breaksError } = await supabase
    .from('break_times')
    .select('*')
    .eq('profissional_id', profissional_id)
    .eq('dia_semana', diaSemana)
    .eq('ativo', true)

  if (breaksError) throw breaksError

  const conflictingBreak = (breaks ?? []).find((breakTime) =>
    hasRangeConflict(
      hora_inicio,
      hora_fim,
      breakTime.hora_inicio,
      breakTime.hora_fim,
    ),
  )

  if (conflictingBreak) {
    throw new Error(
      `Horário indisponível por intervalo: ${
        conflictingBreak.motivo ?? 'Intervalo'
      } (${normalizeTime(conflictingBreak.hora_inicio)} até ${normalizeTime(
        conflictingBreak.hora_fim,
      )}).`,
    )
  }

  return true
}