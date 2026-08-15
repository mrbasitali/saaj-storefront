export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  // Deliberately different cookie name from the admin panel's
  // saaj_token, so the two apps' sessions can never collide even if
  // ever served from the same domain.
  const token = useCookie<string | null>('saaj_customer_token', {
    maxAge: 60 * 60 * 24 * 30,
    sameSite: 'lax',
  })

  const api = $fetch.create({
    baseURL: config.public.apiBaseUrl,

    onRequest({ options }) {
      const headers = new Headers(options.headers)

      headers.set('Accept', 'application/json')

      if (token.value) {
        headers.set('Authorization', `Bearer ${token.value}`)
      }

      options.headers = headers
    },

    onResponseError({ response }) {
      // Clear a stale/expired token, but don't force-navigate — most
      // of this app is public browsing, and a 401 from some
      // background call (e.g. checking wishlist status) shouldn't
      // yank someone away from a product page they're reading.
      // Pages that actually require auth handle that themselves.
      if (response.status === 401) {
        token.value = null
      }
    },
  })

  return {
    provide: {
      api,
    },
  }
})
