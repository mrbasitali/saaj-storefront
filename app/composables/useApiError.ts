/**
 * Every API error follows the same shape from the backend: a generic
 * top-level `message`, and — for validation-style errors — a more
 * specific `errors` object keyed by field. Reading only
 * `error.data.message` silently discards that detail, which is
 * exactly why "The email field is required." was collapsing into a
 * useless "Validation failed." on screen — the backend was sending
 * the real detail the whole time, the frontend just never looked at
 * where it was.
 *
 * Use this anywhere an API error gets shown to the customer, instead
 * of `error?.data?.message || 'fallback'` directly.
 */
export function extractApiErrorMessage(error: any, fallback: string): string {
  const fieldErrors = error?.data?.errors || {}
  const firstFieldError = Object.values(fieldErrors)[0]
  const specificMessage = Array.isArray(firstFieldError) ? firstFieldError[0] : firstFieldError

  return (specificMessage as string) || error?.data?.message || fallback
}
