type ApiOptions = Record<string, any>

type CsrfResponse = {
  csrf_token: string
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const authStore = useAuthStore()
  const apiBase = String(config.public.apiBaseUrl).replace(/\/+$/, '')

  // One-time cleanup of the superseded JavaScript-readable bearer token.
  if (import.meta.client) {
    const legacyToken = useCookie<string | null>('saaj_customer_token', {
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })
    legacyToken.value = null
  }

  let csrfToken: string | null = null
  let csrfRequest: Promise<string> | null = null

  function methodOf(options: ApiOptions) {
    return String(options.method ?? 'GET').toUpperCase()
  }

  async function getCsrfToken(force = false): Promise<string> {
    if (!force && csrfToken) return csrfToken
    if (csrfRequest) return await csrfRequest

    csrfRequest = $fetch<CsrfResponse>('/auth/csrf-token', {
      baseURL: apiBase,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
    }).then((response) => {
      if (!response.csrf_token) {
        throw new Error('The API did not return a CSRF token.')
      }

      csrfToken = response.csrf_token
      return response.csrf_token
    }).finally(() => {
      csrfRequest = null
    })

    return await csrfRequest
  }

  const rawApi = $fetch.create({
    baseURL: apiBase,
    credentials: 'include',

    onRequest({ options }) {
      const headers = new Headers(options.headers)
      headers.set('Accept', 'application/json')
      headers.set('X-Requested-With', 'XMLHttpRequest')

      if (!SAFE_METHODS.has(String(options.method ?? 'GET').toUpperCase()) && csrfToken) {
        headers.set('X-CSRF-TOKEN', csrfToken)
      }

      options.headers = headers
    },

    onResponseError({ response }) {
      const data = response._data as { code?: string } | undefined
      const inactive = response.status === 403 && data?.code === 'customer_inactive'

      // Public browsing should continue if a customer session ends. Pages that
      // require login have their own route middleware and will redirect there.
      if (response.status === 401 || inactive) {
        authStore.clearSession()
      }
    },
  })

  async function api<T = unknown>(request: string, options: ApiOptions = {}): Promise<T> {
    const unsafe = !SAFE_METHODS.has(methodOf(options))

    if (unsafe) {
      await getCsrfToken()
    }

    try {
      return await rawApi<T>(request, options)
    } catch (error: any) {
      const status = Number(error?.response?.status ?? error?.statusCode ?? error?.status ?? 0)

      if (unsafe && status === 419) {
        await getCsrfToken(true)
        return await rawApi<T>(request, options)
      }

      throw error
    }
  }

  return {
    provide: {
      api,
    },
  }
})
