import { supabase } from "@/lib/supabase"

type SlotParams = {
  profissional_id: string
  data_agendamento: string
  duracao_minutos: number
  editingAppointmentId?: string | null
}

type BusyEvent = {
  id: string
  hora_inicio: string
  hora_fim: string
}

function normalizeTime(time: string) {
  return time.slice(0, 5)
}

function timeToMinutes(time: string) {
  const [hours, minutes] = normalizeTime(time).split(":").map(Number)
  return hours * 60 + minutes
}

function minutesToTime(total: number) {
  const hours = Math.floor(total / 60)
  const minutes = total % 60

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
}

function hasConflict(
  start: string,
  end: string,
  busyStart: string,
  busyEnd: string,
) {
  const startMin = timeToMinutes(start)
  const endMin = timeToMinutes(end)
  const busyStartMin = timeToMinutes(busyStart)
  const busyEndMin = timeToMinutes(busyEnd)

  return startMin < busyEndMin && endMin > busyStartMin
}

export async function getAvailableSlots({
  profissional_id,
  data_agendamento,
  duracao_minutos,
  editingAppointmentId = null,
}: SlotParams) {
  const [year, month, day] = data_agendamento.split("-").map(Number)
  const date = new Date(year, month - 1, day)
  const diaSemana = date.getDay()

  const { data: workingHour, error: workingHourError } = await supabase
    .from("working_hours")
    .select("*")
    .eq("profissional_id", profissional_id)
    .eq("dia_semana", diaSemana)
    .eq("ativo", true)
    .maybeSingle()

  if (workingHourError) throw workingHourError

  if (!workingHour) return []

  const { data: appointmentsData, error: appointmentsError } = await supabase
    .from("appointments")
    .select("id, hora_inicio, hora_fim")
    .eq("profissional_id", profissional_id)
    .eq("data_agendamento", data_agendamento)
    .not("status", "in", '("cancelado","faltou")')

  if (appointmentsError) throw appointmentsError

  const { data: blocksData, error: blocksError } = await supabase
    .from("schedule_blocks")
    .select("id, hora_inicio, hora_fim")
    .eq("profissional_id", profissional_id)
    .eq("data_bloqueio", data_agendamento)

  if (blocksError) throw blocksError

  const { data: breaksData, error: breaksError } = await supabase
    .from("break_times")
    .select("id, hora_inicio, hora_fim")
    .eq("profissional_id", profissional_id)
    .eq("dia_semana", diaSemana)
    .eq("ativo", true)

  if (breaksError) throw breaksError

  const busyEvents: BusyEvent[] = [
    ...((appointmentsData ?? []).filter(
      (item) => item.id !== editingAppointmentId,
    ) as BusyEvent[]),
    ...((blocksData ?? []) as BusyEvent[]),
    ...((breaksData ?? []) as BusyEvent[]),
  ]

  const slots: string[] = []

  const startMin = timeToMinutes(workingHour.hora_inicio)
  const endMin = timeToMinutes(workingHour.hora_fim)

  for (let current = startMin; current + duracao_minutos <= endMin; current += 30) {
    const slotStart = minutesToTime(current)
    const slotEnd = minutesToTime(current + duracao_minutos)

    const conflict = busyEvents.some((busy) =>
      hasConflict(slotStart, slotEnd, busy.hora_inicio, busy.hora_fim),
    )

    if (!conflict) {
      slots.push(slotStart)
    }
  }

  return slots
}