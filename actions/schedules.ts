import { supabase } from "@/lib/supabase"
import type { ProfessionalSchedule } from "@/types/schedule"

export async function getSchedules(profissional_id: string) {
  const { data, error } = await supabase
    .from("professional_schedules")
    .select("*")
    .eq("profissional_id", profissional_id)
    .order("dia_semana")

  if (error) throw error
  return data as ProfessionalSchedule[]
}

export async function upsertSchedule(schedule: Partial<ProfessionalSchedule>) {
  const { data, error } = await supabase
    .from("professional_schedules")
    .upsert(schedule)
    .select()
    .single()

  if (error) throw error
  return data
}