'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function CallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    // Listen for auth state — Supabase client auto-processes hash tokens
    // and fires PASSWORD_RECOVERY or SIGNED_IN
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        subscription.unsubscribe()
        router.replace('/auth/set-password')
      }
    })

    // Also handle PKCE ?code= flow
    const code = searchParams.get('code')
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) {
          subscription.unsubscribe()
          router.replace('/login?error=Invalid+or+expired+link')
        }
        // success handled by onAuthStateChange above
      })
    }

    // Fallback: if nothing fires in 4s, check for an existing session
    const timeout = setTimeout(async () => {
      subscription.unsubscribe()
      const { data: { session } } = await supabase.auth.getSession()
      router.replace(session ? '/auth/set-password' : '/login?error=Invalid+or+expired+link')
    }, 4000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-sm text-gray-500">Setting up your account…</p>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    }>
      <CallbackHandler />
    </Suspense>
  )
}
