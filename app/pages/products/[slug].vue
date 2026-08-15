<script setup lang="ts">
type AttributeValue = {
  attribute_id: number
  attribute_name: string
  attribute_code: string
  value_id: number
  value: string
  slug: string
  color_code: string | null
}

type Variant = {
  id: number
  name: string
  option_summary: string | null
  price: string | number
  sale_price: string | number | null
  compare_at_price: string | number | null
  is_default: boolean
  is_active: boolean
  attribute_values: AttributeValue[]
  primary_image?: { optimized_urls?: { detail?: string | null } | null } | null
  images?: Array<{ optimized_urls?: { detail?: string | null } | null }>
}

type ProductDetail = {
  id: number
  name: string
  slug: string
  short_description: string | null
  description: string | null
  care_instructions: string | null
  brand?: { name: string } | null
  primary_image?: { optimized_urls?: { detail?: string | null } | null } | null
  active_variants: Variant[]
}

const route = useRoute()
const { $api } = useNuxtApp()
const cart = useCartStore()

const { data, error } = await useAsyncData(`product-${route.params.slug}`, () =>
  $api<{ data: ProductDetail }>(`/products/${route.params.slug}`),
)

if (error.value) {
  throw createError({ statusCode: 404, statusMessage: 'Product not found' })
}

const product = computed(() => data.value!.data)

// Build a Color/Size-style picker from the flat attribute_values list
// each variant carries — group unique attributes, then unique values
// per attribute, across every active variant.
const attributeGroups = computed(() => {
  const groups = new Map<string, { name: string, values: Map<string, AttributeValue> }>()

  for (const variant of product.value.active_variants) {
    for (const av of variant.attribute_values) {
      if (!groups.has(av.attribute_code)) {
        groups.set(av.attribute_code, { name: av.attribute_name, values: new Map() })
      }

      groups.get(av.attribute_code)!.values.set(av.slug, av)
    }
  }

  return Array.from(groups.entries()).map(([code, group]) => ({
    code,
    name: group.name,
    values: Array.from(group.values.values()),
  }))
})

const selected = reactive<Record<string, string>>({})

// Pre-select the default variant's options, or the first variant if
// none is marked default.
const initialVariant = product.value.active_variants.find((v) => v.is_default) ?? product.value.active_variants[0]

if (initialVariant) {
  for (const av of initialVariant.attribute_values) {
    selected[av.attribute_code] = av.slug
  }
}

const matchedVariant = computed(() => {
  return product.value.active_variants.find((variant) => {
    return variant.attribute_values.every((av) => selected[av.attribute_code] === av.slug)
      && variant.attribute_values.length === Object.keys(selected).length
  }) ?? null
})

// A given value might not combine with whatever else is already
// selected — greyed out rather than hidden, so the picker doesn't
// visually reflow every time something's chosen.
function isValueAvailable(attributeCode: string, valueSlug: string): boolean {
  const trial = { ...selected, [attributeCode]: valueSlug }

  return product.value.active_variants.some((variant) =>
    variant.attribute_values.every((av) => trial[av.attribute_code] === av.slug),
  )
}

function selectValue(attributeCode: string, valueSlug: string) {
  selected[attributeCode] = valueSlug
}

const activeImage = computed(() => {
  return matchedVariant.value?.primary_image?.optimized_urls?.detail
    ?? product.value.primary_image?.optimized_urls?.detail
    ?? null
})

const displayPrice = computed(() => matchedVariant.value?.sale_price ?? matchedVariant.value?.price ?? null)
const isOnSale = computed(() => {
  const v = matchedVariant.value

  return !!(v?.sale_price && Number(v.sale_price) < Number(v.price))
})

const quantity = ref(1)
const adding = ref(false)
const addedMessage = ref('')

function addToCart() {
  if (!matchedVariant.value) return

  adding.value = true

  cart.add({
    variantId: matchedVariant.value.id,
    productName: product.value.name,
    productSlug: product.value.slug,
    optionSummary: matchedVariant.value.option_summary,
    price: Number(displayPrice.value),
    imageUrl: activeImage.value,
    maxQuantity: null,
  }, quantity.value)

  addedMessage.value = 'Added to cart.'
  adding.value = false

  setTimeout(() => { addedMessage.value = '' }, 3000)
}

// Wishlist — best-effort only; a guest simply gets sent to log in,
// this never blocks viewing or buying the product itself.
const authStore = useAuthStore()
const wishlistBusy = ref(false)

async function toggleWishlist() {
  if (!authStore.isLoggedIn) {
    await navigateTo(`/login?redirect=/products/${product.value.slug}`)

    return
  }

  wishlistBusy.value = true

  try {
    await $api('/customer/wishlist', {
      method: 'POST',
      body: { product_id: product.value.id },
    })
  } finally {
    wishlistBusy.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-7xl px-5 py-12 sm:px-8">
    <div class="grid gap-10 lg:grid-cols-2 lg:gap-16">
      <div class="aspect-[3/4] overflow-hidden rounded-2xl bg-stone-200">
        <NuxtImg
          v-if="activeImage"
          :src="activeImage"
          :alt="product.name"
          class="h-full w-full object-cover"
        />
      </div>

      <div>
        <p
          v-if="product.brand"
          class="text-[13px] font-medium uppercase tracking-[0.1em] text-ink-400"
        >
          {{ product.brand.name }}
        </p>

        <h1 class="mt-2 font-display text-3xl font-medium text-ink-900 sm:text-4xl">
          {{ product.name }}
        </h1>

        <p
          v-if="displayPrice !== null"
          class="mt-4 flex items-center gap-3 text-lg"
        >
          <span class="text-ink-900">Rs {{ Number(displayPrice).toLocaleString() }}</span>
          <span
            v-if="isOnSale"
            class="text-ink-400 line-through"
          >
            Rs {{ Number(matchedVariant!.price).toLocaleString() }}
          </span>
        </p>

        <p
          v-if="product.short_description"
          class="mt-5 max-w-md text-[15px] leading-relaxed text-ink-500"
        >
          {{ product.short_description }}
        </p>

        <div
          v-for="group in attributeGroups"
          :key="group.code"
          class="mt-7"
        >
          <p class="mb-2.5 text-[13px] font-medium text-ink-700">
            {{ group.name }}
          </p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="value in group.values"
              :key="value.value_id"
              type="button"
              :disabled="!isValueAvailable(group.code, value.slug)"
              class="rounded-full border px-4 py-2 text-sm transition disabled:cursor-not-allowed disabled:opacity-35"
              :class="selected[group.code] === value.slug
                ? 'border-ink-900 bg-ink-900 text-stone-50'
                : 'border-stone-300 text-ink-700 hover:border-ink-900'"
              @click="selectValue(group.code, value.slug)"
            >
              {{ value.value }}
            </button>
          </div>
        </div>

        <div class="mt-8 flex items-center gap-4">
          <div class="flex items-center rounded-full border border-stone-300">
            <button
              type="button"
              class="px-4 py-2.5 text-ink-700"
              @click="quantity = Math.max(1, quantity - 1)"
            >
              −
            </button>
            <span class="w-8 text-center text-sm text-ink-900">{{ quantity }}</span>
            <button
              type="button"
              class="px-4 py-2.5 text-ink-700"
              @click="quantity++"
            >
              +
            </button>
          </div>

          <button
            type="button"
            :disabled="!matchedVariant || adding"
            class="flex-1 rounded-full bg-ink-900 py-3.5 text-[15px] font-medium text-stone-50 transition hover:bg-indigo-900 disabled:opacity-50"
            @click="addToCart"
          >
            {{ matchedVariant ? 'Add to cart' : 'Select options' }}
          </button>

          <button
            type="button"
            aria-label="Add to wishlist"
            :disabled="wishlistBusy"
            class="rounded-full border border-stone-300 p-3.5 text-ink-700 transition hover:border-brass-500 hover:text-brass-600"
            @click="toggleWishlist"
          >
            <svg
              class="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.6"
            >
              <path d="M12 20.5s-7.5-4.6-9.8-9.2C.6 7.8 2.3 4.5 5.6 4.1c2-.3 3.7.7 4.9 2.4C11.7 4.8 13.4 3.8 15.4 4.1c3.3.4 5 3.7 3.4 7.2C16.5 15.9 12 20.5 12 20.5Z" />
            </svg>
          </button>
        </div>

        <p
          v-if="addedMessage"
          class="mt-3 text-sm text-indigo-700"
        >
          {{ addedMessage }}
          <NuxtLink
            to="/cart"
            class="underline decoration-indigo-300 underline-offset-4"
          >
            View cart
          </NuxtLink>
        </p>

        <div
          v-if="product.description"
          class="mt-10 border-t border-stone-200 pt-8"
        >
          <p class="text-[13px] font-medium uppercase tracking-[0.08em] text-ink-400">
            Details
          </p>
          <p class="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-ink-700">
            {{ product.description }}
          </p>
        </div>

        <div
          v-if="product.care_instructions"
          class="mt-6"
        >
          <p class="text-[13px] font-medium uppercase tracking-[0.08em] text-ink-400">
            Care
          </p>
          <p class="mt-3 text-[15px] leading-relaxed text-ink-700">
            {{ product.care_instructions }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
