<script setup lang="ts">
import type { ProductDetail } from '~/components/StorefrontProductDetail.vue'

const route = useRoute()
const { $api } = useNuxtApp()

const slug = computed(() => String(route.params.slug || ''))
const previewToken = computed(() => {
  const value = route.query.preview
  return typeof value === 'string' ? value.trim() : ''
})
const isPreviewMode = computed(() => previewToken.value !== '')

// Product data is SEO-critical, so wait for it during SSR. Draft preview uses
// a separate token-protected API endpoint and a separate async-data key so a
// preview response can never be confused with the public product response.
const { data, pending, error, refresh } = await useAsyncData<{ data: ProductDetail }>(
  () => `product-${slug.value}-${isPreviewMode.value ? 'preview' : 'public'}`,
  () => isPreviewMode.value
    ? $api<{ data: ProductDetail }>(`/products/${encodeURIComponent(slug.value)}`, {
        query: { preview: previewToken.value },
      })
    : $api<{ data: ProductDetail }>(`/products/${encodeURIComponent(slug.value)}`),
  { watch: [slug, previewToken] },
)

// Do not render a soft-404 product page with a 200 response. Search engines
// should receive the actual upstream status when a product does not exist.
if (import.meta.server && error.value) {
  const upstreamStatus = Number((error.value as any)?.statusCode || (error.value as any)?.status || 500)
  const previewDenied = isPreviewMode.value && [401, 403, 410].includes(upstreamStatus)
  throw createError({
    statusCode: upstreamStatus === 404 ? 404 : previewDenied ? 403 : 502,
    statusMessage: upstreamStatus === 404
      ? 'Product not found'
      : previewDenied
        ? 'Product preview unavailable'
        : 'Product service unavailable',
  })
}

</script>

<template>
  <StorefrontProductDetail :product="data?.data" :slug="slug" :preview="isPreviewMode" :pending="pending" :failed="!!error" @retry="refresh()" />
</template>
