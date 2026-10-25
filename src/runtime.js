// Browser half of the mobile fixes: installs the stylesheet plus the few behaviours CSS cannot express
// (menu button, drawer backdrop, closing the drawer after navigation, edge swipe, viewport meta).
// scripts/build.mjs inlines this file and src/mobile.css into client.js.

/** Width below which the sidebar becomes a drawer; matches the media queries in mobile.css. */
export const MOBILE_QUERY = '(max-width: 767px)'

const MENU_LABELS = { ko: '사이드바 열기', en: 'Open sidebar', zh: '打开侧边栏', ja: 'サイドバーを開く' }
const MENU_ICON = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h10"/></svg>'
const VIEWPORT_EXTRAS = ['viewport-fit=cover', 'interactive-widget=resizes-content']
const SWIPE_EDGE = 28
const SWIPE_DISTANCE = 60

/**
 * Install the mobile layout on a Harness web page.
 * @param {object} options
 * @param {{ toggleSidebar(): void, panelInfo?: { getSnapshot(): { activePanelId: unknown }, subscribe(listener: () => void): () => void } }} options.layout - ctx.layout
 * @param {string} options.css - stylesheet text (src/mobile.css)
 * @param {Document} [options.doc]
 * @param {Window} [options.win]
 * @returns {() => void} undo everything this call did
 */
export function install({ layout, css, doc = document, win = window }) {
  const html = doc.documentElement
  // The macOS and Windows desktop shells keep their own window chrome and layout.
  if (html.dataset.platform === 'darwin' || html.hasAttribute('data-windows-titlebar')) return () => {}

  const cleanups = []
  const listen = (target, type, handler, options) => {
    target.addEventListener(type, handler, options)
    cleanups.push(() => target.removeEventListener(type, handler, options))
  }

  const style = doc.createElement('style')
  style.setAttribute('data-dmf-style', '')
  style.textContent = css
  doc.head.append(style)
  html.setAttribute('data-dmf', '')
  cleanups.push(() => {
    style.remove()
    for (const name of ['data-dmf', 'data-dmf-drawer', 'data-dmf-panel']) html.removeAttribute(name)
  })

  // Safe-area insets need viewport-fit=cover; resizes-content keeps the composer above the on-screen keyboard.
  const meta = doc.querySelector('meta[name="viewport"]')
  const viewport = meta?.getAttribute('content')
  if (meta && viewport != null) {
    const extras = VIEWPORT_EXTRAS.filter(extra => !viewport.includes(extra.split('=')[0]))
    if (extras.length > 0) {
      meta.setAttribute('content', [viewport, ...extras].join(', '))
      cleanups.push(() => meta.setAttribute('content', viewport))
    }
  }

  const media = win.matchMedia(MOBILE_QUERY)
  const frame = () => doc.querySelector('[data-shell-bottom]')?.parentElement ?? null
  const collapsed = () => frame()?.hasAttribute('data-sidebar-collapsed') ?? true
  const isOpen = () => media.matches && frame() !== null && !collapsed()
  const dialogOpen = () => doc.querySelector('[role="dialog"], [aria-modal="true"]') !== null
  const open = () => { if (media.matches && frame() !== null && collapsed()) layout.toggleSidebar() }
  const close = () => { if (isOpen()) layout.toggleSidebar() }

  const button = doc.createElement('button')
  button.type = 'button'
  button.setAttribute('data-dmf-menu', '')
  button.innerHTML = MENU_ICON
  listen(button, 'click', open)

  const backdrop = doc.createElement('div')
  backdrop.setAttribute('data-dmf-backdrop', '')
  backdrop.setAttribute('aria-hidden', 'true')
  listen(backdrop, 'click', close)

  const sync = () => {
    const drawer = isOpen()
    html.toggleAttribute('data-dmf-drawer', drawer)
    html.toggleAttribute('data-dmf-panel', layout.panelInfo?.getSnapshot().activePanelId != null)
    const lang = (html.lang || 'en').toLowerCase().split('-')[0]
    button.setAttribute('aria-label', MENU_LABELS[lang] ?? MENU_LABELS.en)
    button.setAttribute('aria-expanded', String(drawer))
  }

  // The frame publishes its collapse state as an attribute; watching only that attribute keeps
  // streaming conversation updates out of the observer.
  const observer = new win.MutationObserver(sync)
  observer.observe(html, { subtree: true, attributes: true, attributeFilter: ['data-sidebar-collapsed', 'data-rightbar-fullscreen'] })
  cleanups.push(() => observer.disconnect())
  listen(media, 'change', sync)

  if (layout.panelInfo) {
    let panel = layout.panelInfo.getSnapshot().activePanelId
    cleanups.push(layout.panelInfo.subscribe(() => {
      const next = layout.panelInfo.getSnapshot().activePanelId
      if (next !== panel) { panel = next; close() }
      sync()
    }))
  }

  // Picking a session or starting a new one from the drawer should reveal it. Row action buttons
  // (archive, pin, menu) and everything else in the drawer keep it open.
  listen(doc, 'click', event => {
    const target = event.target
    if (!isOpen() || !(target instanceof win.Element) || !target.closest('[class*="_sidebarCol"]')) return
    const sessionRow = target.closest('[data-row-key^="session:"]') !== null && target.closest('button') === null
    const newSession = target.closest('[class*="_newSession"], [class*="_brand"]') !== null
    if (sessionRow || newSession) win.setTimeout(close, 0)
  })

  // Capture phase: menus and search fields that consume this Escape are still in the DOM here.
  listen(doc, 'keydown', event => {
    if (event.key !== 'Escape' || event.defaultPrevented || !isOpen() || dialogOpen()) return
    const target = event.target instanceof win.Element ? event.target : null
    if (target?.closest('input, textarea, [contenteditable]:not([contenteditable="false"])')) return
    if (doc.querySelector('[role="menu"], [role="listbox"]') !== null) return
    close()
  }, { capture: true })

  // Swipe right from the left edge opens the drawer; swipe left on the drawer or backdrop closes it.
  let swipe = null
  listen(doc, 'touchstart', event => {
    swipe = null
    if (!media.matches || event.touches.length !== 1 || dialogOpen()) return
    const touch = event.touches[0]
    const opened = isOpen()
    const target = event.target instanceof win.Element ? event.target : null
    if (opened ? target?.closest('[class*="_sidebarCol"], [data-dmf-backdrop]') : touch.clientX <= SWIPE_EDGE) {
      swipe = { x: touch.clientX, y: touch.clientY, opened }
    }
  }, { passive: true })
  listen(doc, 'touchend', event => {
    const start = swipe
    swipe = null
    const touch = event.changedTouches[0]
    if (!start || !touch) return
    const dx = touch.clientX - start.x
    if (Math.abs(touch.clientY - start.y) > Math.abs(dx)) return
    if (!start.opened && dx > SWIPE_DISTANCE) open()
    if (start.opened && dx < -SWIPE_DISTANCE) close()
  }, { passive: true })
  listen(doc, 'touchcancel', () => { swipe = null }, { passive: true })

  // Immediate client modules run from <head>, before <body> exists.
  const mount = () => { doc.body.append(backdrop, button); sync() }
  if (doc.body) mount()
  else listen(doc, 'DOMContentLoaded', mount, { once: true })
  cleanups.push(() => { button.remove(); backdrop.remove() })

  sync()
  return () => { for (const cleanup of cleanups.reverse()) cleanup() }
}
