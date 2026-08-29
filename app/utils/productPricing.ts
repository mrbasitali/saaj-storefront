export type PriceValue = string | number | null | undefined

export type ProductPricing = {
  currentPrice: number | null
  originalPrice: number | null
  salePrice: number | null
  isOnSale: boolean
  savings: number
  discountPercentage: number
}

function normalizePrice(value: PriceValue) {
  if (value === null || value === undefined || value === '') return null

  const price = Number(value)
  return Number.isFinite(price) && price >= 0 ? price : null
}

export function resolveProductPricing(
  originalPriceValue: PriceValue,
  salePriceValue: PriceValue,
): ProductPricing {
  const originalPrice = normalizePrice(originalPriceValue)
  const salePrice = normalizePrice(salePriceValue)
  const isOnSale = originalPrice !== null
    && salePrice !== null
    && salePrice < originalPrice

  const currentPrice = isOnSale ? salePrice : originalPrice
  const savings = isOnSale ? originalPrice - salePrice : 0
  const discountPercentage = isOnSale && originalPrice > 0
    ? Math.round((savings / originalPrice) * 100)
    : 0

  return {
    currentPrice,
    originalPrice,
    salePrice,
    isOnSale,
    savings,
    discountPercentage,
  }
}

export function formatStorefrontPrice(value: PriceValue) {
  const price = normalizePrice(value)
  if (price === null) return ''

  return `Rs ${price.toLocaleString('en-PK', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`
}
