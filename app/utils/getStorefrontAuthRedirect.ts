export function getStorefrontAuthRedirect(value: unknown): string {
  if (
    typeof value !== 'string'
    || !value.startsWith('/')
    || value.startsWith('//')
    || value.includes('\\')
    || /[\u0000-\u0020\u007f]/.test(value)
  ) {
    return '/account'
  }

  const url = new URL(value, 'https://storefront.invalid')
  if (url.pathname.startsWith('//') || /^\/(?:login|register)\/?$/i.test(url.pathname)) return '/account'

  return `${url.pathname}${url.search}${url.hash}`
}
