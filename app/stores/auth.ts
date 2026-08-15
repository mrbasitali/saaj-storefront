type Customer = {
  id: number
  name: string
  email: string | null
  phone: string | null
  secondary_phone: string | null
  gender: string | null
  date_of_birth: string | null
  address: string | null
  city: string | null
  country: string | null
  email_verified: boolean
  phone_verified: boolean
}

export const useAuthStore = defineStore('auth', () => {
  const customer = ref<Customer | null>(null)

  const isLoggedIn = computed(() => customer.value !== null)

  async function fetchMe() {
    const { $api } = useNuxtApp()

    try {
      const response = await $api<{ customer: Customer }>('/customer/me')

      customer.value = response.customer

      return true
    } catch {
      customer.value = null

      return false
    }
  }

  // Backend only supports email login currently — no phone-based
  // login path exists in LoginCustomerRequest. Checked directly
  // against the actual validation rules rather than assumed, after
  // the mismatch this caused (sending "login" when the backend
  // expects "email").
  async function login(payload: { email: string, password: string }) {
    const { $api } = useNuxtApp()
    const token = useCookie<string | null>('saaj_customer_token')

    const response = await $api<{ message: string, token: string, customer: Customer }>('/customer/login', {
      method: 'POST',
      body: payload,
    })

    token.value = response.token
    customer.value = response.customer

    return response.customer
  }

  // email is required, phone is optional — matches
  // RegisterCustomerRequest's actual validation rules, not assumed.
  async function register(payload: {
    name: string
    email: string
    phone?: string
    password: string
    password_confirmation: string
  }) {
    const { $api } = useNuxtApp()
    const token = useCookie<string | null>('saaj_customer_token')

    const response = await $api<{ message: string, token: string, customer: Customer }>('/customer/register', {
      method: 'POST',
      body: payload,
    })

    token.value = response.token
    customer.value = response.customer

    return response.customer
  }

  async function logout() {
    const { $api } = useNuxtApp()
    const token = useCookie<string | null>('saaj_customer_token')

    try {
      await $api('/customer/logout', { method: 'POST' })
    } catch {
      // Even if the server call fails (e.g. token already expired),
      // still clear local state — the person's intent is to be
      // logged out regardless of network conditions.
    }

    token.value = null
    customer.value = null
  }

  async function updateProfile(payload: Record<string, unknown>) {
    const { $api } = useNuxtApp()

    const response = await $api<{ message: string, customer: Customer }>('/customer/profile', {
      method: 'PUT',
      body: payload,
    })

    customer.value = response.customer

    return response.customer
  }

  return {
    customer,
    isLoggedIn,
    fetchMe,
    login,
    register,
    logout,
    updateProfile,
  }
})
