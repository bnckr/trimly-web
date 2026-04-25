'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session) {
        router.replace('/dashboard')
      } else {
        router.replace('/login')
      }
    }

    checkSession()
  }, [router])

  return <LoadingSpinner />;
}