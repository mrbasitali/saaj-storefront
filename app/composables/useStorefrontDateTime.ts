type DateValue = string | number | Date | null | undefined

export function useStorefrontDateTime() {
  const settings = useSiteSettingsStore()
  const timezone = computed(() => settings.settings?.timezone || 'Asia/Karachi')
  const currentYear = computed(() => new Intl.DateTimeFormat('en', {
    year: 'numeric',
    timeZone: timezone.value,
  }).format(new Date()))

  function formatDate(value: DateValue, options: Intl.DateTimeFormatOptions = {}) {
    if (!value) return '—'
    const date = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(date.getTime())) return '—'

    return new Intl.DateTimeFormat('en-PK', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      timeZone: timezone.value,
      ...options,
    }).format(date)
  }

  function formatDateTime(value: DateValue, options: Intl.DateTimeFormatOptions = {}) {
    return formatDate(value, {
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
      ...options,
    })
  }

  return { timezone, currentYear, formatDate, formatDateTime }
}
