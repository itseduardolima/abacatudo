/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: 'standalone',
  transpilePackages: ['@gastos/shared'],
  // Só em desenvolvimento: web e API na mesma origem (/api/*), como o Caddy faz em produção — sem CORS e
  // com o cookie de sessão host-only funcionando (docs/specs/01-arquitetura.md § Um domínio só).
  async rewrites() {
    if (process.env.NODE_ENV === 'production') return []
    const apiUrl = process.env.API_INTERNAL_URL ?? 'http://localhost:3001'
    return [{ source: '/api/:path*', destination: `${apiUrl}/:path*` }]
  },
}

export default nextConfig
