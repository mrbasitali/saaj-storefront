<script setup lang="ts">
type Product = {
  id: number
  name: string
  slug: string
  primary_image?: { optimized_urls?: { card?: string | null } | null, alt_text?: string | null } | null
  default_variant?: { price: string | number, sale_price: string | number | null, compare_at_price: string | number | null } | null
}

type ProductsResponse = {
  data: Product[]
  meta: { current_page: number, last_page: number, total: number }
}

type FilterAttribute = {
  code: string
  name: string
  values: Array<{ slug: string, value: string, color_code: string | null }>
}

const route = useRoute()
const router = useRouter()
const { $api } = useNuxtApp()

// Search box text lives locally and does NOT trigger anything on its
// own — only submitting the form pushes it into the URL. Typing
// should never fire a request; that was the actual bug.
const searchInput = ref((route.query.search as string) || '')
const page = ref(Number(route.query.page) || 1)

// Filter selections also live locally, applied to the URL only on
// "Apply filters" — immediate-on-click would refetch on every single
// checkbox toggle, which is the same category of bad UX as
// search-while-typing.
const selectedAttributes = reactive<Record<string, string[]>>({})
const filtersOpen = ref(false)

const { data: filterOptions } = await useAsyncData('shop-filter-options', () =>
  $api<{ data: FilterAttribute[] }>('/products/filters'),
)

// Seed selections from the URL so filters survive a refresh/share.
for (const attr of filterOptions.value?.data ?? []) {
  const fromUrl = route.query[`attr_${attr.code}`]

  if (fromUrl) {
    selectedAttributes[attr.code] = Array.isArray(fromUrl) ? fromUrl as string[] : [fromUrl as string]
  }
}

const { data, pending } = await useAsyncData<ProductsResponse>(
  'shop-products',
  () => {
    const attributeQuery: Record<string, string[]> = {}

    for (const [code, values] of Object.entries(selectedAttributes)) {
      if (values.length > 0) attributeQuery[code] = values
    }

    return $api<ProductsResponse>('/products', {
      query: {
        category: route.query.category || undefined,
        search: route.query.search || undefined,
        page: page.value,
        per_page: 20,
        attributes: Object.keys(attributeQuery).length > 0 ? attributeQuery : undefined,
      },
    })
  },
  // Explicit, URL-driven dependencies only — never the raw typing
  // state, only what's actually been submitted/applied.
  { watch: [() => route.query.category, () => route.query.search, page] },
)

const products = computed(() => data.value?.data ?? [])
const meta = computed(() => data.value?.meta)

function submitSearch() {
  page.value = 1
  router.push({ query: { ...route.query, search: searchInput.value || undefined, page: undefined } })
}

function toggleAttributeValue(code: string, slug: string) {
  const current = selectedAttributes[code] ?? []

  selectedAttributes[code] = current.includes(slug)
    ? current.filter((v) => v !== slug)
    : [...current, slug]
}

function applyFilters() {
  page.value = 1

  const query: Record<string, any> = { ...route.query, page: undefined }

  // Clear any previous attr_ params before setting the current ones,
  // so unchecking every value in a group actually removes it from
  // the URL instead of leaving a stale empty entry behind.
  for (const key of Object.keys(query)) {
    if (key.startsWith('attr_')) delete query[key]
  }

  for (const [code, values] of Object.entries(selectedAttributes)) {
    if (values.length > 0) query[`attr_${code}`] = values
  }

  router.push({ query })

  // Re-run the product fetch — attribute selections aren't part of
  // the watch array (they're plain reactive state, not URL-derived,
  // until the line above), so trigger it explicitly here.
  refreshNuxtData('shop-products')

  filtersOpen.value = false
}

function clearFilters() {
  for (const code of Object.keys(selectedAttributes)) {
    selectedAttributes[code] = []
  }

  applyFilters()
}

const activeFilterCount = computed(() =>
  Object.values(selectedAttributes).reduce((sum, values) => sum + values.length, 0),
)
</script>

<template>
  <div class="mx-auto max-w-7xl px-5 py-12 sm:px-8">
    <div class="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="font-display text-3xl font-medium text-ink-900">
          {{ route.query.category ? 'Shop' : 'All products' }}
        </h1>
        <p
          v-if="meta"
          class="mt-1 text-sm text-ink-500"
        >
          {{ meta.total }} {{ meta.total === 1 ? 'piece' : 'pieces' }}
        </p>
      </div>

      <div class="flex items-center gap-3">
        <form
          class="flex w-full max-w-xs items-center gap-2 rounded-full border border-stone-300 bg-white px-4 py-2.5"
          @submit.prevent="submitSearch"
        >
          <input
            v-model="searchInput"
            type="search"
            placeholder="Search products"
            class="w-full bg-transparent text-sm text-ink-900 outline-none placeholder:text-ink-400"
          >
          <button
            type="submit"
            aria-label="Search"
            class="shrink-0 text-ink-500 hover:text-ink-900"
          >
            <svg
              class="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle
                cx="11"
                cy="11"
                r="7"
              />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </button>
        </form>

        <button
          v-if="filterOptions?.data?.length"
          type="button"
          class="flex shrink-0 items-center gap-2 rounded-full border border-stone-300 px-4 py-2.5 text-sm text-ink-900"
          @click="filtersOpen = !filtersOpen"
        >
          Filters
          <span
            v-if="activeFilterCount > 0"
            class="flex h-5 w-5 items-center justify-center rounded-full bg-ink-900 text-[11px] text-stone-50"
          >
            {{ activeFilterCount }}
          </span>
        </button>
      </div>
    </div>

    <div
      v-if="filtersOpen"
      class="mt-6 rounded-2xl border border-stone-200 bg-white p-5"
    >
      <div class="grid gap-6 sm:grid-cols-3">
        <div
          v-for="attr in filterOptions?.data ?? []"
          :key="attr.code"
        >
          <p class="text-[13px] font-medium text-ink-700">
            {{ attr.name }}
          </p>
          <div class="mt-2.5 flex flex-wrap gap-2">
            <button
              v-for="val in attr.values"
              :key="val.slug"
              type="button"
              class="rounded-full border px-3 py-1.5 text-[13px] transition"
              :class="(selectedAttributes[attr.code] ?? []).includes(val.slug)
                ? 'border-ink-900 bg-ink-900 text-stone-50'
                : 'border-stone-300 text-ink-700 hover:border-ink-900'"
              @click="toggleAttributeValue(attr.code, val.slug)"
            >
              {{ val.value }}
            </button>
          </div>
        </div>
      </div>

      <div class="mt-6 flex items-center gap-3 border-t border-stone-200 pt-5">
        <button
          type="button"
          class="rounded-full bg-ink-900 px-6 py-2.5 text-sm font-medium text-stone-50 transition hover:bg-indigo-900"
          @click="applyFilters"
        >
          Apply filters
        </button>
        <button
          type="button"
          class="text-sm text-ink-500 hover:text-ink-900"
          @click="clearFilters"
        >
          Clear all
        </button>
      </div>
    </div>

    <div
      v-if="pending"
      class="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4"
    >
      <div
        v-for="n in 8"
        :key="n"
        class="aspect-[3/4] animate-pulse rounded-xl bg-stone-200"
      />
    </div>

    <div
      v-else-if="products.length === 0"
      class="mt-20 text-center"
    >
      <p class="font-display text-xl text-ink-700">
        Nothing found
      </p>
      <p class="mt-2 text-sm text-ink-500">
        Try a different search or filter combination.
      </p>
    </div>

    <div
      v-else
      class="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4"
    >
      <ProductCard
        v-for="product in products"
        :key="product.id"
        :product="product"
      />
    </div>

    <div
      v-if="meta && meta.last_page > 1"
      class="mt-12 flex items-center justify-center gap-2"
    >
      <button
        v-for="p in meta.last_page"
        :key="p"
        type="button"
        class="h-9 w-9 rounded-full text-sm transition"
        :class="p === meta.current_page ? 'bg-ink-900 text-stone-50' : 'text-ink-700 hover:bg-stone-200'"
        @click="page = p"
      >
        {{ p }}
      </button>
    </div>
  </div>
</template>
