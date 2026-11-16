type PrivateOrderLink = {
  path: string
  token: string | null
}

type OpenedLink = { token: string, closed: boolean }

const stateKey = 'saajPrivateOrderLink'

function readPrivateOrderLink(length: 32 | 48): OpenedLink {
  const { pathname, search, hash } = window.location
  const history = window.history
  const saved = history.state?.[stateKey] as PrivateOrderLink | undefined
  const current = saved?.path === pathname ? saved : undefined
  const token = hash ? hash.slice(1) : current?.token

  if (!token || !new RegExp(`^[A-Za-z0-9]{${length}}$`).test(token)) {
    return { token: '', closed: !hash && current?.token === null }
  }

  if (hash) {
    try {
      // Keep the token on this history entry so reload and Back can recover it.
      history.replaceState({
        ...history.state,
        [stateKey]: { path: pathname, token } satisfies PrivateOrderLink,
      }, '', pathname + search)
    } catch {
      // If the browser blocks the history write, the original fragment remains.
    }
  }

  return { token, closed: false }
}

export function usePrivateOrderLink(length: 32 | 48, open: (link: OpenedLink) => void | Promise<void>) {
  let path = ''
  let opened: OpenedLink

  function restoreHistoryEntry() {
    if (window.location.pathname !== path || window.location.hash) return
    const restored = readPrivateOrderLink(length)
    // Two order links can have the same clean URL, so the router may reuse the page.
    if (restored.token !== opened.token || restored.closed !== opened.closed) {
      window.location.reload()
    }
  }

  onMounted(() => {
    path = window.location.pathname
    opened = readPrivateOrderLink(length)
    window.addEventListener('popstate', restoreHistoryEntry)
    void open(opened)
  })

  onBeforeUnmount(() => window.removeEventListener('popstate', restoreHistoryEntry))
}

export function retirePrivateOrderLink(token: string): void {
  const history = window.history
  const { pathname, search, hash } = window.location
  const saved = history.state?.[stateKey] as PrivateOrderLink | undefined

  // An earlier request may finish after a different order link has opened.
  if (!token || (hash ? hash !== `#${token}` : saved?.path !== pathname || saved.token !== token)) return

  try {
    history.replaceState({
      ...history.state,
      [stateKey]: { path: pathname, token: null } satisfies PrivateOrderLink,
    }, '', pathname + search)
  } catch {
    // The server also rejects used and expired links on the next open.
  }
}
