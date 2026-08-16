export function useOtpCooldown(defaultSeconds = 30) {
  const remaining = ref(0)
  let timer: ReturnType<typeof setInterval> | null = null

  function stop() {
    if (timer) clearInterval(timer)
    timer = null
  }

  function start(seconds = defaultSeconds) {
    stop()
    remaining.value = Math.max(0, Math.ceil(Number(seconds) || defaultSeconds))

    timer = setInterval(() => {
      remaining.value = Math.max(0, remaining.value - 1)
      if (remaining.value === 0) stop()
    }, 1000)
  }

  const formattedRemaining = computed(() => {
    if (remaining.value < 60) return `${remaining.value}s`
    const minutes = Math.floor(remaining.value / 60)
    const seconds = String(remaining.value % 60).padStart(2, '0')
    return `${minutes}:${seconds}`
  })

  onBeforeUnmount(stop)

  return {
    remaining,
    formattedRemaining,
    canResend: computed(() => remaining.value === 0),
    start,
    stop,
  }
}
