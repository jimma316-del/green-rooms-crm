import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// API routes site team are allowed to call
const SITE_ALLOWED_API = /^\/api\/leads\/[^/]+\/sign-off$/

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const isAuthRoute = path.startsWith('/login')
  const isApiRoute = path.startsWith('/api')
  const isSiteRoute = path.startsWith('/jobs')

  if (!user && !isAuthRoute && !isApiRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role

    if (isAuthRoute) {
      const url = request.nextUrl.clone()
      url.pathname = role === 'site' ? '/jobs' : '/dashboard'
      return NextResponse.redirect(url)
    }

    if (role === 'site') {
      // Block any API route except sign-off submission
      if (isApiRoute && !SITE_ALLOWED_API.test(path)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      // Block any page route outside /jobs
      if (!isSiteRoute && !isApiRoute) {
        const url = request.nextUrl.clone()
        url.pathname = '/jobs'
        return NextResponse.redirect(url)
      }
    }
  }

  return supabaseResponse
}
