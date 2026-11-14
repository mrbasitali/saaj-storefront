export function isCompletePhoneNumber(value: string) {
  const digits = value.replace(/\D/g, '')
  return /^\+?[\d\s().-]+$/.test(value.trim()) && digits.length >= 10 && digits.length <= 15
}
