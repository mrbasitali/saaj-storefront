export default defineEventHandler((event) => {
  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
  setHeader(event, 'Cache-Control', 'public, max-age=3600, s-maxage=86400')

  return [
    'User-agent: *',
    'Allow: /',
    '',
    'Sitemap: https://www.saaj.pk/sitemap.xml',
    '',
  ].join('\n')
})
