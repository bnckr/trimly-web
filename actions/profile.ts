import { supabase } from "@/lib/supabase"
import { requireUser } from "@/lib/auth"

export async function getMyProfile() {
  const user = await requireUser()

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  if (error) throw error
  return data
}

export async function updateMyProfile(input: {
  nome: string
  telefone?: string | null
  especialidade?: string | null
  cor_agenda?: string | null
  intervalo_padrao_minutos?: number
  observacoes?: string | null
}) {
  const user = await requireUser()

  const { data, error } = await supabase
    .from("profiles")
    .update({
      nome: input.nome,
      telefone: input.telefone ?? null,
      especialidade: input.especialidade ?? null,
      cor_agenda: input.cor_agenda ?? "#71bbef",
      intervalo_padrao_minutos: input.intervalo_padrao_minutos ?? 0,
      observacoes: input.observacoes ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function uploadAvatar(file: File) {
  const user = await requireUser()

  const filePath = `${user.id}/${Date.now()}-${file.name}`

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(filePath, file, {
      upsert: true,
    })

  if (uploadError) throw uploadError

  const { data } = supabase.storage
    .from("avatars")
    .getPublicUrl(filePath)

  const publicUrl = data.publicUrl

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      avatar_url: publicUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id)

  if (updateError) throw updateError

  return publicUrl
}