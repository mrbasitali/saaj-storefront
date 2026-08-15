<script setup lang="ts">
const cart = useCartStore()
</script>

<template>
  <div class="mx-auto max-w-4xl px-5 py-12 sm:px-8">
    <h1 class="font-display text-3xl font-medium text-ink-900">
      Your cart
    </h1>

    <div
      v-if="cart.items.length === 0"
      class="mt-16 text-center"
    >
      <p class="font-display text-xl text-ink-700">
        Your cart is empty
      </p>
      <NuxtLink
        to="/shop"
        class="mt-4 inline-block rounded-full bg-ink-900 px-7 py-3 text-[15px] font-medium text-stone-50 transition hover:bg-indigo-900"
      >
        Start shopping
      </NuxtLink>
    </div>

    <div
      v-else
      class="mt-8 grid gap-10 lg:grid-cols-[1fr_320px]"
    >
      <ul class="divide-y divide-stone-200">
        <li
          v-for="item in cart.items"
          :key="item.variantId"
          class="flex gap-4 py-5"
        >
          <div class="h-24 w-20 shrink-0 overflow-hidden rounded-lg bg-stone-200">
            <NuxtImg
              v-if="item.imageUrl"
              :src="item.imageUrl"
              :alt="item.productName"
              class="h-full w-full object-cover"
            />
          </div>

          <div class="flex flex-1 flex-col">
            <div class="flex items-start justify-between gap-4">
              <div>
                <NuxtLink
                  :to="`/products/${item.productSlug}`"
                  class="text-[15px] font-medium text-ink-900 hover:underline"
                >
                  {{ item.productName }}
                </NuxtLink>
                <p
                  v-if="item.optionSummary"
                  class="mt-0.5 text-sm text-ink-500"
                >
                  {{ item.optionSummary }}
                </p>
              </div>

              <button
                type="button"
                class="text-sm text-ink-400 hover:text-red-600"
                @click="cart.remove(item.variantId)"
              >
                Remove
              </button>
            </div>

            <div class="mt-auto flex items-center justify-between">
              <div class="flex items-center rounded-full border border-stone-300">
                <button
                  type="button"
                  class="px-3 py-1.5 text-ink-700"
                  @click="cart.updateQuantity(item.variantId, item.quantity - 1)"
                >
                  −
                </button>
                <span class="w-7 text-center text-sm text-ink-900">{{ item.quantity }}</span>
                <button
                  type="button"
                  class="px-3 py-1.5 text-ink-700"
                  @click="cart.updateQuantity(item.variantId, item.quantity + 1)"
                >
                  +
                </button>
              </div>

              <p class="text-[15px] text-ink-900">
                Rs {{ (item.price * item.quantity).toLocaleString() }}
              </p>
            </div>
          </div>
        </li>
      </ul>

      <div class="h-fit rounded-2xl bg-stone-100 p-6">
        <div class="flex items-center justify-between text-[15px]">
          <span class="text-ink-500">Subtotal</span>
          <span class="text-ink-900">Rs {{ cart.subtotal.toLocaleString() }}</span>
        </div>
        <p class="mt-1.5 text-xs text-ink-400">
          Shipping calculated at checkout.
        </p>

        <NuxtLink
          to="/checkout"
          class="mt-6 block rounded-full bg-ink-900 py-3.5 text-center text-[15px] font-medium text-stone-50 transition hover:bg-indigo-900"
        >
          Checkout
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
