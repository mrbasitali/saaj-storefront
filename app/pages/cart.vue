<script setup lang="ts">
const cart = useCartStore()

useSeoMeta({
  title: 'Shopping Bag | SAAJ',
  description: 'Review the pieces in your SAAJ shopping bag before checkout.',
  robots: 'noindex,nofollow',
})

const itemLabel = computed(() => {
  const count = cart.totalItems
  return `${count} ${count === 1 ? 'piece' : 'pieces'}`
})

function formatPrice(value: number) {
  return `Rs ${Number(value || 0).toLocaleString('en-PK')}`
}

function canIncrease(item: { quantity: number, maxQuantity: number | null }) {
  return item.maxQuantity === null || item.quantity < item.maxQuantity
}

function increase(variantId: number) {
  const item = cart.items.find(entry => entry.variantId === variantId)
  if (!item || !canIncrease(item)) return
  cart.updateQuantity(variantId, item.quantity + 1)
}

function decrease(variantId: number) {
  const item = cart.items.find(entry => entry.variantId === variantId)
  if (!item) return
  cart.updateQuantity(variantId, item.quantity - 1)
}
</script>

<template>
  <main class="min-h-[72vh] bg-paper-50 pb-32 text-charcoal-950 lg:pb-20">
    <div class="mx-auto max-w-[1500px] px-5 pt-8 sm:px-8 sm:pt-10 lg:px-10 lg:pt-12">
      <nav
        aria-label="Checkout progress"
        class="flex items-center gap-2 overflow-x-auto pb-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-charcoal-400 sm:gap-3"
      >
        <span class="flex shrink-0 items-center gap-2 text-charcoal-950">
          <span class="flex h-5 w-5 items-center justify-center rounded-full bg-charcoal-950 text-[8px] text-paper-50">01</span>
          Bag
        </span>
        <span class="h-px w-7 shrink-0 bg-charcoal-950/15 sm:w-10" />
        <span class="flex shrink-0 items-center gap-2">
          <span class="flex h-5 w-5 items-center justify-center rounded-full border border-charcoal-950/15 text-[8px]">02</span>
          Delivery
        </span>
        <span class="h-px w-7 shrink-0 bg-charcoal-950/15 sm:w-10" />
        <span class="flex shrink-0 items-center gap-2">
          <span class="flex h-5 w-5 items-center justify-center rounded-full border border-charcoal-950/15 text-[8px]">03</span>
          Confirmation
        </span>
      </nav>

      <header class="mt-7 flex items-end justify-between gap-6 border-b border-charcoal-950/10 pb-5 sm:mt-9 sm:pb-6">
        <div>
          <p class="section-kicker">Your selection</p>
          <h1 class="mt-2 font-display text-[38px] font-medium leading-none tracking-[-0.035em] sm:text-[46px] lg:text-[52px]">
            Shopping bag
          </h1>
        </div>
        <p
          v-if="cart.hydrated"
          class="mb-1 shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-charcoal-400"
        >
          {{ itemLabel }}
        </p>
      </header>

      <!-- Local-storage cart data is client-only. Keep the final layout shape
           reserved until hydration so SSR never flashes an incorrect empty bag. -->
      <div
        v-if="!cart.hydrated"
        class="grid gap-10 py-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-14 xl:gap-20"
        aria-busy="true"
        aria-label="Loading shopping bag"
      >
        <div class="space-y-0">
          <div
            v-for="index in 2"
            :key="index"
            class="grid grid-cols-[96px_minmax(0,1fr)] gap-4 border-b border-charcoal-950/10 py-6 sm:grid-cols-[132px_minmax(0,1fr)] sm:gap-6"
          >
            <div class="skeleton aspect-[3/4] w-full" />
            <div class="flex min-w-0 flex-col py-1">
              <div class="skeleton h-3 w-24" />
              <div class="skeleton mt-3 h-5 w-3/5" />
              <div class="skeleton mt-3 h-3 w-2/5" />
              <div class="mt-auto flex items-end justify-between gap-6 pt-7">
                <div class="skeleton h-9 w-28" />
                <div class="skeleton h-4 w-20" />
              </div>
            </div>
          </div>
        </div>
        <aside class="hidden lg:block">
          <div class="skeleton h-[310px] w-full" />
        </aside>
      </div>

      <section
        v-else-if="cart.items.length === 0"
        class="flex min-h-[48vh] flex-col items-center justify-center px-4 py-16 text-center sm:py-24"
      >
        <div class="flex h-14 w-14 items-center justify-center rounded-full border border-charcoal-950/12">
          <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">
            <path d="M6.8 8.2h10.4l-.7 11H7.5l-.7-11Z" />
            <path d="M9.2 9V6.6a2.8 2.8 0 0 1 5.6 0V9" />
          </svg>
        </div>
        <p class="mt-7 section-kicker">Nothing here yet</p>
        <h2 class="mt-3 max-w-xl font-display text-[36px] font-medium leading-[0.98] tracking-[-0.035em] sm:text-[44px]">
          Your bag is waiting for something considered.
        </h2>
        <p class="mt-5 max-w-md text-sm leading-7 text-charcoal-500">
          Explore the latest SAAJ edit and add the pieces you want to come back to.
        </p>
        <NuxtLink
          to="/shop"
          class="mt-8 inline-flex min-h-12 items-center justify-center bg-charcoal-950 px-8 text-[10px] font-semibold uppercase tracking-[0.16em] text-paper-50 transition duration-200 hover:opacity-85"
        >
          Explore the shop
        </NuxtLink>
      </section>

      <div
        v-else
        class="grid gap-10 py-2 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-14 xl:gap-20"
      >
        <div class="min-w-0">
          <TransitionGroup
            name="cart-row"
            tag="ul"
            aria-label="Shopping bag items"
          >
            <li
              v-for="item in cart.items"
              :key="item.variantId"
              class="grid grid-cols-[96px_minmax(0,1fr)] gap-4 border-b border-charcoal-950/10 py-6 sm:grid-cols-[132px_minmax(0,1fr)] sm:gap-6 sm:py-7"
            >
              <NuxtLink
                :to="`/products/${item.productSlug}`"
                class="group relative block aspect-[3/4] overflow-hidden bg-mist-100"
                :aria-label="`View ${item.productName}`"
              >
                <NuxtImg
                  v-if="item.imageUrl"
                  :src="item.imageUrl"
                  :alt="item.productName"
                  sizes="96px sm:132px"
                  class="h-full w-full object-cover transition duration-500 ease-out group-hover:scale-[1.02]"
                />
                <div
                  v-else
                  class="flex h-full w-full items-center justify-center text-[9px] font-semibold uppercase tracking-[0.13em] text-charcoal-350"
                >
                  SAAJ
                </div>
              </NuxtLink>

              <div class="flex min-w-0 flex-col py-0.5 sm:py-1">
                <div class="flex items-start justify-between gap-4">
                  <div class="min-w-0">
                    <p class="text-[9px] font-semibold uppercase tracking-[0.16em] text-charcoal-400">
                      SAAJ
                    </p>
                    <NuxtLink
                      :to="`/products/${item.productSlug}`"
                      class="mt-1.5 block truncate text-[14px] font-medium tracking-[-0.01em] text-charcoal-950 transition hover:opacity-60 sm:text-[15px]"
                    >
                      {{ item.productName }}
                    </NuxtLink>
                    <p
                      v-if="item.optionSummary"
                      class="mt-1.5 text-[12px] leading-5 text-charcoal-500"
                    >
                      {{ item.optionSummary }}
                    </p>
                    <p
                      v-if="item.maxQuantity !== null && item.maxQuantity <= 5"
                      class="mt-1.5 text-[10px] uppercase tracking-[0.09em] text-charcoal-400"
                    >
                      {{ item.maxQuantity }} available
                    </p>
                  </div>

                  <button
                    type="button"
                    class="group/remove flex h-8 w-8 shrink-0 items-center justify-center text-charcoal-400 transition hover:text-charcoal-950"
                    :aria-label="`Remove ${item.productName} from bag`"
                    @click="cart.remove(item.variantId)"
                  >
                    <svg viewBox="0 0 24 24" class="h-4 w-4 transition duration-200 group-hover/remove:rotate-90" fill="none" stroke="currentColor" stroke-width="1.35" aria-hidden="true">
                      <path d="m7 7 10 10M17 7 7 17" />
                    </svg>
                  </button>
                </div>

                <div class="mt-auto flex items-end justify-between gap-4 pt-5 sm:pt-7">
                  <div>
                    <p class="mb-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-charcoal-400">
                      Quantity
                    </p>
                    <div class="inline-flex h-9 items-center border border-charcoal-950/14 bg-paper-50">
                      <button
                        type="button"
                        class="flex h-full w-9 items-center justify-center text-charcoal-700 transition hover:bg-charcoal-950 hover:text-paper-50 disabled:cursor-not-allowed disabled:opacity-30"
                        :aria-label="`Decrease quantity of ${item.productName}`"
                        @click="decrease(item.variantId)"
                      >
                        <span aria-hidden="true">−</span>
                      </button>
                      <span class="min-w-8 px-1 text-center text-[12px] font-medium tabular-nums text-charcoal-950">
                        {{ item.quantity }}
                      </span>
                      <button
                        type="button"
                        class="flex h-full w-9 items-center justify-center text-charcoal-700 transition hover:bg-charcoal-950 hover:text-paper-50 disabled:cursor-not-allowed disabled:opacity-25"
                        :disabled="!canIncrease(item)"
                        :aria-label="`Increase quantity of ${item.productName}`"
                        @click="increase(item.variantId)"
                      >
                        <span aria-hidden="true">+</span>
                      </button>
                    </div>
                  </div>

                  <div class="text-right">
                    <p class="text-[13px] font-medium tabular-nums text-charcoal-950 sm:text-[14px]">
                      {{ formatPrice(item.price * item.quantity) }}
                    </p>
                    <p
                      v-if="item.quantity > 1"
                      class="mt-1 text-[10px] tabular-nums text-charcoal-400"
                    >
                      {{ formatPrice(item.price) }} each
                    </p>
                  </div>
                </div>
              </div>
            </li>
          </TransitionGroup>

          <div class="flex items-center justify-between gap-5 py-6">
            <NuxtLink
              to="/shop"
              class="group inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-charcoal-600 transition hover:text-charcoal-950"
            >
              <svg viewBox="0 0 24 24" class="h-3.5 w-3.5 transition duration-200 group-hover:-translate-x-1" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                <path d="M19 12H5m6-6-6 6 6 6" />
              </svg>
              Continue shopping
            </NuxtLink>

            <button
              type="button"
              class="text-[10px] font-semibold uppercase tracking-[0.13em] text-charcoal-400 transition hover:text-charcoal-950"
              @click="cart.clear()"
            >
              Clear bag
            </button>
          </div>
        </div>

        <aside class="hidden lg:block">
          <div class="sticky top-[126px] bg-mist-50 px-7 py-8 xl:px-8">
            <div class="flex items-center justify-between border-b border-charcoal-950/10 pb-5">
              <h2 class="font-display text-[28px] font-medium leading-none tracking-[-0.025em]">
                Order summary
              </h2>
              <span class="text-[9px] font-semibold uppercase tracking-[0.14em] text-charcoal-400">
                {{ itemLabel }}
              </span>
            </div>

            <div class="space-y-3.5 py-6 text-[13px]">
              <div class="flex items-center justify-between gap-6">
                <span class="text-charcoal-500">Subtotal</span>
                <span class="font-medium tabular-nums text-charcoal-950">{{ formatPrice(cart.subtotal) }}</span>
              </div>
              <div class="flex items-start justify-between gap-6">
                <span class="text-charcoal-500">Shipping</span>
                <span class="max-w-[190px] text-right text-[11px] leading-5 text-charcoal-400">Calculated at checkout</span>
              </div>
            </div>

            <div class="border-t border-charcoal-950/10 pt-5">
              <div class="flex items-end justify-between gap-6">
                <div>
                  <p class="text-[10px] font-semibold uppercase tracking-[0.14em] text-charcoal-400">Subtotal</p>
                  <p class="mt-1 text-[11px] leading-5 text-charcoal-400">Excluding delivery</p>
                </div>
                <p class="font-display text-[27px] font-medium leading-none tabular-nums tracking-[-0.025em]">
                  {{ formatPrice(cart.subtotal) }}
                </p>
              </div>

              <NuxtLink
                to="/checkout"
                class="cart-checkout-button group mt-7 flex min-h-13 w-full items-center justify-center gap-3 bg-charcoal-950 px-6 text-[10px] font-semibold uppercase tracking-[0.16em] text-paper-50"
              >
                Continue to checkout
                <svg viewBox="0 0 24 24" class="h-3.5 w-3.5 transition duration-200 group-hover:translate-x-1" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                  <path d="M5 12h14m-6-6 6 6-6 6" />
                </svg>
              </NuxtLink>

              <div class="mt-5 space-y-2.5 border-t border-charcoal-950/10 pt-5 text-[10px] leading-5 text-charcoal-400">
                <p class="flex items-start gap-2.5">
                  <svg viewBox="0 0 24 24" class="mt-0.5 h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">
                    <path d="M4 8.5 12 4l8 4.5v7L12 20l-8-4.5v-7Z" />
                    <path d="m4 8.5 8 4.5 8-4.5M12 13v7" />
                  </svg>
                  Delivery cost is calculated from your selected location at checkout.
                </p>
                <p class="flex items-start gap-2.5">
                  <svg viewBox="0 0 24 24" class="mt-0.5 h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">
                    <path d="M7 11V8a5 5 0 0 1 10 0v3" />
                    <rect x="5" y="11" width="14" height="9" rx="1" />
                  </svg>
                  Your final order and stock availability are confirmed at checkout.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>

    <!-- Mobile checkout stays within thumb reach and mirrors the live cart total. -->
    <Transition name="cart-mobile-checkout">
      <div
        v-if="cart.hydrated && cart.items.length"
        class="fixed inset-x-0 bottom-0 z-40 border-t border-charcoal-950/10 bg-paper-50/96 px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_35px_rgba(0,0,0,0.06)] backdrop-blur-xl lg:hidden"
      >
        <div class="mx-auto flex max-w-xl items-center gap-4">
          <div class="min-w-0 flex-1">
            <p class="text-[9px] font-semibold uppercase tracking-[0.13em] text-charcoal-400">Subtotal</p>
            <p class="mt-0.5 truncate text-[15px] font-medium tabular-nums text-charcoal-950">{{ formatPrice(cart.subtotal) }}</p>
          </div>
          <NuxtLink
            to="/checkout"
            class="cart-checkout-button flex min-h-12 shrink-0 items-center justify-center gap-2 bg-charcoal-950 px-6 text-[10px] font-semibold uppercase tracking-[0.14em] text-paper-50"
          >
            Checkout
            <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
              <path d="M5 12h14m-6-6 6 6-6 6" />
            </svg>
          </NuxtLink>
        </div>
      </div>
    </Transition>
  </main>
</template>
