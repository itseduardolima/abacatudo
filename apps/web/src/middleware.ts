import { NextResponse, type NextRequest } from 'next/server'

// CSP com nonce por requisição (08-seguranca § 2): script só 'self' + nonce, sem 'unsafe-inline' em script.
// 'unsafe-eval' só em desenvolvimento (o HMR do Next precisa). O widget Pluggy Connect (Sprint 6) entra
// aqui, só na tela de conectar banco. style-src precisa de 'unsafe-inline' (style props do React/Next).
export function middleware(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID())
  const isDev = process.env.NODE_ENV === 'development'
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDev ? [] : ['upgrade-insecure-requests']),
  ].join('; ')

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('content-security-policy', csp)
  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set('content-security-policy', csp)
  return response
}

export const config = {
  matcher: [{ source: '/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|brand/).*)' }],
}
