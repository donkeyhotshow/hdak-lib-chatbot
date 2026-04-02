import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('base64');

  const csp = [
    "default-src 'self'",
    // nonce + strict-dynamic: the nonced script is trusted; anything it loads is trusted too.
    // This covers Next.js chunk loading without listing every bundle URL.
    `script-src 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    "connect-src 'self' https://api.groq.com https://dashscope-intl.aliyuncs.com https://openrouter.ai https://*.openrouter.ai https://library-service.com.ua https://library-service.com.ua:8443 https://*.neon.tech https://fcm.googleapis.com",
    "worker-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');

  // Forward nonce to server components via request header
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);

  return response;
}

export const config = {
  matcher: [
    // Run on all page routes; skip static files that don't need a dynamic CSP.
    '/((?!_next/static|_next/image|favicon|icons|manifest\\.json|sw\\.js|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|xml)).*)',
  ],
};
