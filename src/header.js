// Decorate existing host buttons without replacing their React-owned children
// or click handlers. Observe only action outlets for live counts and labels.
const ACTION_OUTLET = '[data-slot="conversation.session.header.actions"]'
const ACTION_PATHS = {
  team: '<circle cx="9" cy="8" r="3"/><path d="M3 21v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 4v2"/>',
  subagents: '<rect x="9" y="2" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="16" y="16" width="6" height="6" rx="1"/><path d="M12 8v4M5 16v-4h14v4"/>',
  jobs: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m7 9 3 3-3 3m6 0h4"/>',
}

export function installHeaderActions({ doc, win, media, preference }) {
  const html = doc.documentElement
  const entries = new Map()
  const roots = new Map()
  const cleanups = []
  let disposed = false
  let hovered = null
  let focused = null
  let keyboard = true
  let press = null
  let suppressClick = null
  let hoverTimer = null
  let tooltipAnchor = null
  const listen = (target, type, handler, options) => {
    target.addEventListener(type, handler, options)
    cleanups.push(() => target.removeEventListener(type, handler, options))
  }
  const active = () => media.matches && preference.getSnapshot().enabled
  const copy = () => SETTINGS_COPY[(html.lang || 'en').toLowerCase().split('-')[0]] ?? SETTINGS_COPY.en
  const tooltip = doc.createElement('div')
  tooltip.setAttribute('data-dmf-tooltip', '')
  tooltip.setAttribute('role', 'tooltip')
  tooltip.hidden = true
  let suffix = 0
  do { tooltip.id = `dmf-header-tooltip-${suffix++}` } while (doc.getElementById(tooltip.id))

  const describe = (button, add) => {
    const ids = new Set((button.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean))
    if (add) ids.add(tooltip.id)
    else ids.delete(tooltip.id)
    if (ids.size) button.setAttribute('aria-describedby', [...ids].join(' '))
    else button.removeAttribute('aria-describedby')
  }
  const cancelHover = () => { win.clearTimeout(hoverTimer); hoverTimer = null }
  const hide = () => {
    cancelHover()
    if (tooltipAnchor) describe(tooltipAnchor, false)
    tooltipAnchor = null
    tooltip.hidden = true
  }
  const cancelPress = () => { if (press) win.clearTimeout(press.timer); press = null }
  const show = button => {
    const entry = entries.get(button)
    if (!active() || !entry || !button.isConnected || button.getAttribute('aria-expanded') === 'true') return
    if (tooltipAnchor !== button) hide()
    tooltip.textContent = entry.label
    if (!tooltip.isConnected) doc.body.append(tooltip)
    tooltip.hidden = false
    tooltipAnchor = button
    describe(button, true)
    const rect = button.getBoundingClientRect()
    const box = tooltip.getBoundingClientRect()
    const height = win.visualViewport?.height || win.innerHeight
    tooltip.style.left = `${Math.max(8, Math.min(rect.left + (rect.width - box.width) / 2, win.innerWidth - box.width - 8))}px`
    tooltip.style.top = `${Math.max(8, Math.min(rect.bottom + 8, height - box.height - 8))}px`
  }
  const restore = (button, entry) => {
    if (tooltipAnchor === button) hide()
    entry.icon.remove()
    entry.badge.remove()
    button.removeAttribute('data-dmf-action')
    if (entry.writtenLabel && button.getAttribute('aria-label') === entry.writtenLabel) {
      if (entry.originalLabel === null) button.removeAttribute('aria-label')
      else button.setAttribute('aria-label', entry.originalLabel)
    }
    entries.delete(button)
  }
  const kindOf = button => {
    if (button.querySelector('[class*="_triggerLabel"]')) return 'team'
    if (button.getAttribute('aria-haspopup') === 'tree') return 'subagents'
    if (button.querySelector('[class*="_count"]')) return 'jobs'
    return null
  }
  const refresh = root => {
    if (disposed) return
    for (const [button, entry] of entries) {
      if (entry.root === root && (!active() || !root.contains(button))) restore(button, entry)
    }
    if (!active()) return
    for (const button of root.querySelectorAll('button[class*="_trigger"]')) {
      const kind = kindOf(button)
      if (!kind) continue
      let entry = entries.get(button)
      if (!entry) {
        const icon = doc.createElement('span')
        icon.setAttribute('data-dmf-action-icon', '')
        icon.setAttribute('aria-hidden', 'true')
        icon.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${ACTION_PATHS[kind]}</svg>`
        const badge = doc.createElement('span')
        badge.setAttribute('data-dmf-action-count', '')
        badge.setAttribute('aria-hidden', 'true')
        entry = { root, icon, badge, originalLabel: button.getAttribute('aria-label'), writtenLabel: null, label: '' }
        entries.set(button, entry)
        button.setAttribute('data-dmf-action', kind)
        button.append(icon, badge)
      }
      const originalText = [...button.childNodes].filter(node => node !== entry.icon && node !== entry.badge)
        .map(node => node.textContent).join(' ').replace(/\s+/g, ' ').trim()
      const nativeLabel = button.getAttribute('aria-label')
      entry.label = nativeLabel && nativeLabel !== entry.writtenLabel
        ? nativeLabel : `${copy()[kind]}${originalText ? ` · ${originalText}` : ''}`
      if (!nativeLabel || nativeLabel === entry.writtenLabel) {
        if (nativeLabel !== entry.label) button.setAttribute('aria-label', entry.label)
        entry.writtenLabel = entry.label
      }
      const countText = button.querySelector('[class*="_count"]')?.textContent || originalText
      const count = countText.match(/[\p{N}][\p{N},.\u202f\u00a0]*/u)?.[0].trim() || ''
      const badge = Number(count.replaceAll(',', '')) > 99 ? '99+' : count
      if (entry.badge.textContent !== badge) entry.badge.textContent = badge
      if (tooltipAnchor === button) {
        if (button.getAttribute('aria-expanded') === 'true') hide()
        else if (tooltip.textContent !== entry.label) show(button)
      }
    }
  }
  const attach = root => {
    if (roots.has(root)) return
    const observer = new win.MutationObserver(() => refresh(root))
    observer.observe(root, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['aria-label', 'aria-expanded'] })
    roots.set(root, observer)
    refresh(root)
  }
  const discover = node => {
    if (!(node instanceof win.Element)) return
    if (node.matches(ACTION_OUTLET)) attach(node)
    for (const root of node.querySelectorAll(ACTION_OUTLET)) attach(root)
  }
  const treeObserver = new win.MutationObserver(records => {
    if (disposed) return
    for (const record of records) for (const node of record.addedNodes) discover(node)
    for (const [root, observer] of roots) {
      if (root.isConnected) continue
      observer.disconnect()
      roots.delete(root)
      for (const [button, entry] of entries) if (entry.root === root) restore(button, entry)
    }
  })
  treeObserver.observe(html, { subtree: true, childList: true })
  const sync = () => {
    hide()
    cancelPress()
    suppressClick = null
    hovered = focused = null
    html.toggleAttribute('data-dmf-icons', active())
    for (const root of roots.keys()) refresh(root)
  }
  cleanups.push(preference.subscribe(sync))
  listen(media, 'change', sync)
  discover(html)
  sync()

  const action = event => {
    const button = event.target instanceof win.Element ? event.target.closest('button[data-dmf-action]') : null
    return button && !button.disabled && active() ? button : null
  }
  listen(doc, 'pointerover', event => {
    const button = action(event)
    if (!button || event.pointerType === 'touch') return
    // Host subagent hover opens a catalog. In compact mode hover explains the
    // icon; clicking still reaches the unchanged host handler and opens it.
    event.stopPropagation()
    if (event.relatedTarget && button.contains(event.relatedTarget)) return
    hovered = button
    cancelHover()
    hoverTimer = win.setTimeout(() => { show(button) }, 400)
  }, { capture: true })
  listen(doc, 'pointerout', event => {
    const button = action(event)
    if (!button || (event.relatedTarget && button.contains(event.relatedTarget))) return
    hovered = null
    if (focused !== button) hide()
  }, { capture: true })
  listen(doc, 'focusin', event => {
    const button = action(event)
    if (button && keyboard) { focused = button; show(button) }
  })
  listen(doc, 'focusout', event => {
    const button = action(event)
    if (button) { focused = null; if (hovered !== button) hide() }
  })
  listen(doc, 'pointerdown', event => {
    keyboard = false
    suppressClick = null
    hide()
    cancelPress()
    const button = action(event)
    if (!button || event.pointerType !== 'touch' || event.isPrimary === false) return
    const pending = { button, x: event.clientX, y: event.clientY, shown: false, timer: null }
    pending.timer = win.setTimeout(() => {
      if (press !== pending) return
      pending.shown = true
      show(button)
    }, 550)
    press = pending
  }, { capture: true, passive: true })
  listen(doc, 'pointermove', event => {
    if (press && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 10) { cancelPress(); hide() }
  }, { passive: true })
  listen(doc, 'pointerup', () => {
    if (press?.shown) suppressClick = press.button
    cancelPress()
  }, { capture: true, passive: true })
  listen(doc, 'pointercancel', () => { cancelPress(); hide() }, { passive: true })
  listen(doc, 'contextmenu', event => { if (action(event)) event.preventDefault() })
  listen(doc, 'click', event => {
    const button = action(event)
    if (button && button === suppressClick) {
      event.preventDefault()
      event.stopImmediatePropagation()
      suppressClick = null
    } else hide()
  }, { capture: true })
  listen(doc, 'keydown', event => {
    keyboard = true
    suppressClick = null
    if (event.key === 'Escape') { cancelPress(); hide() }
  }, { capture: true })
  listen(doc, 'scroll', () => { cancelPress(); hide() }, { capture: true, passive: true })
  listen(win, 'resize', hide)
  if (win.visualViewport) listen(win.visualViewport, 'resize', hide)

  return () => {
    disposed = true
    treeObserver.disconnect()
    for (const observer of roots.values()) observer.disconnect()
    for (const cleanup of cleanups.reverse()) cleanup()
    hide()
    cancelPress()
    for (const [button, entry] of entries) restore(button, entry)
    roots.clear()
    tooltip.remove()
    html.removeAttribute('data-dmf-icons')
  }
}
