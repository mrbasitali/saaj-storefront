type CartItem = {
  variantId: number
  quantity: number
  // Snapshot for display only — checkout always sends just
  // {product_variant_id, quantity}; the backend is the source of
  // truth for price at checkout time, this is never trusted for
  // anything financial, only for rendering the cart itself.
  productName: string
  productSlug: string
  optionSummary: string | null
  price: number
  imageUrl: string | null
  maxQuantity: number | null
}

const STORAGE_KEY = 'saaj_cart'

export const useCartStore = defineStore('cart', () => {
  const items = ref<CartItem[]>([])
  const hydrated = ref(false)

  function hydrate() {
    if (hydrated.value || !import.meta.client) return

    hydrated.value = true

    try {
      const raw = localStorage.getItem(STORAGE_KEY)

      if (raw) items.value = JSON.parse(raw)
    } catch {
      items.value = []
    }
  }

  function persist() {
    if (!import.meta.client) return

    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.value))
  }

  watch(items, persist, { deep: true })

  const totalItems = computed(() => items.value.reduce((sum, item) => sum + item.quantity, 0))
  const subtotal = computed(() => items.value.reduce((sum, item) => sum + item.price * item.quantity, 0))

  function add(item: Omit<CartItem, 'quantity'>, quantity = 1) {
    const existing = items.value.find((i) => i.variantId === item.variantId)

    if (existing) {
      const cap = existing.maxQuantity ?? Infinity

      existing.quantity = Math.min(existing.quantity + quantity, cap)
    } else {
      items.value.push({ ...item, quantity })
    }
  }

  function updateQuantity(variantId: number, quantity: number) {
    const item = items.value.find((i) => i.variantId === variantId)

    if (!item) return

    if (quantity <= 0) {
      remove(variantId)

      return
    }

    const cap = item.maxQuantity ?? Infinity

    item.quantity = Math.min(quantity, cap)
  }

  function remove(variantId: number) {
    items.value = items.value.filter((i) => i.variantId !== variantId)
  }

  function clear() {
    items.value = []
  }

  // Exactly the shape POST /customer/checkout expects — nothing more.
  function toCheckoutItems() {
    return items.value.map((item) => ({
      product_variant_id: item.variantId,
      quantity: item.quantity,
    }))
  }

  return {
    items,
    totalItems,
    subtotal,
    hydrate,
    add,
    updateQuantity,
    remove,
    clear,
    toCheckoutItems,
  }
})
