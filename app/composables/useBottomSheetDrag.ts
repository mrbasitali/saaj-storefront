import type { Ref } from 'vue'

export function useBottomSheetDrag(
  onDismiss: () => void,
  scrollArea: Ref<HTMLElement | null>,
  enabled: () => boolean = () => true,
) {
  const dragY = ref(0)
  const dragging = ref(false)
  let gesture: {
    id: number
    x: number
    y: number
    scroller: HTMLElement | null
    scrollTop: number
    mode: 'pending' | 'native' | 'pull'
  } | null = null

  function reset() {
    gesture = null
    dragging.value = false
    dragY.value = 0
  }

  function onTouchStart(event: TouchEvent) {
    if (!enabled() || event.touches.length !== 1) {
      reset()
      return
    }

    const touch = event.touches[0]!
    const area = scrollArea.value
    const scroller = area && event.target instanceof Node && area.contains(event.target) ? area : null

    gesture = {
      id: touch.identifier,
      x: touch.clientX,
      y: touch.clientY,
      scroller,
      scrollTop: 0,
      mode: 'pending',
    }
  }

  function onTouchMove(event: TouchEvent) {
    if (!gesture || gesture.mode === 'native') return
    const touch = Array.from(event.touches).find(point => point.identifier === gesture?.id)
    if (!touch) return

    const deltaY = touch.clientY - gesture.y
    if (gesture.mode === 'pending') {
      const deltaX = Math.abs(touch.clientX - gesture.x)
      if (Math.max(deltaX, Math.abs(deltaY)) < 6) return
      if (deltaY <= deltaX || !event.cancelable) {
        gesture.mode = 'native'
        return
      }
      // Let upward swipes use the browser's momentum. For a downward pull,
      // consume the remaining list scroll first, then move the sheet.
      gesture.mode = 'pull'
      gesture.scrollTop = Math.max(0, gesture.scroller?.scrollTop ?? 0)
    }

    if (event.cancelable) event.preventDefault()
    if (gesture.scroller) gesture.scroller.scrollTop = Math.max(0, gesture.scrollTop - deltaY)
    dragY.value = Math.max(0, deltaY - gesture.scrollTop)
    dragging.value = dragY.value > 0
  }

  function onTouchEnd(event: TouchEvent) {
    if (!gesture || !Array.from(event.changedTouches).some(point => point.identifier === gesture?.id)) return
    const shouldDismiss = dragY.value > 90
    reset()
    if (shouldDismiss) onDismiss()
  }

  return { dragY, dragging, reset, onTouchStart, onTouchMove, onTouchEnd }
}
