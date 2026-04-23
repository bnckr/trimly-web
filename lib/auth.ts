import { supabase } from './supabase'

export async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) throw error
  return user
}

export async function requireUser() {
  const user = await getCurrentUser()

  if (!user) {
    throw new Error('User is not authenticated.')
  }

  return user
}

export async function getCurrentProfile() {
  const user = await requireUser()

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) throw error
  return data
}