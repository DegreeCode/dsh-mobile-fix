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
  let tooltipSource = null
  let dismissing = false
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
    tooltipSource = null
    tooltip.hidden = true
  }
  const cancelPress = () => { if (press) win.clearTimeout(press.timer); press = null }
  const show = (button, source = 'hover') => {
    const entry = entries.get(button)
    if (!active() || !entry || !button.isConnected) return
    if (source !== 'touch' && button.getAttribute('aria-expanded') === 'true') return
    if (tooltipAnchor !== button) hide()
    tooltip.textContent = entry.label
    if (!tooltip.isConnected) doc.body.append(tooltip)
    tooltip.hidden = false
    tooltipAnchor = button
    tooltipSource = source
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
        if (tooltipSource !== 'touch' && button.getAttribute('aria-expanded') === 'true') hide()
        else if (tooltip.textContent !== entry.label) show(button, tooltipSource)
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
  const hoverIn = event => {
    const button = action(event)
    if (!button) return
    // Host subagent hover opens a catalog. In compact mode hover explains the
    // icon; clicking still reaches the unchanged host handler and opens it.
    event.stopPropagation()
    if (event.pointerType === 'touch' || press || tooltipSource === 'touch') return
    if (event.relatedTarget && button.contains(event.relatedTarget)) return
    hovered = button
    cancelHover()
    hoverTimer = win.setTimeout(() => { show(button, 'hover') }, 400)
  }
  const hoverOut = event => {
    const button = action(event)
    if (!button) {
      // React can synthesize mouse-enter for the destination from a portal's
      // mouse-out, before the destination's mouse-over reaches the document.
      // Pointer-out still passes through so other native tooltips can leave.
      const next = event.relatedTarget instanceof win.Element
        ? event.relatedTarget.closest('button[data-dmf-action]') : null
      if (event.type === 'mouseout' && next && active()) event.stopPropagation()
      return
    }
    event.stopPropagation()
    if (event.pointerType === 'touch' || press || tooltipSource === 'touch') return
    if (event.relatedTarget && button.contains(event.relatedTarget)) return
    hovered = null
    if (focused !== button) hide()
  }
  // Released Harness versions use React mouse enter; others use pointer enter.
  // Suppress both so a compatibility mouse event cannot race the tooltip.
  for (const type of ['pointerover', 'mouseover']) listen(doc, type, hoverIn, { capture: true })
  for (const type of ['pointerout', 'mouseout']) listen(doc, type, hoverOut, { capture: true })
  listen(doc, 'focusin', event => {
    const button = action(event)
    if (button && keyboard && !dismissing) { focused = button; show(button, 'focus') }
  })
  listen(doc, 'focusout', event => {
    const button = action(event)
    if (button) { focused = null; if (hovered !== button && tooltipSource !== 'touch') hide() }
  })
  const hold = pending => {
    if (press !== pending || pending.shown) return
    win.clearTimeout(pending.timer)
    pending.shown = true
    suppressClick = pending.button
    show(pending.button, 'touch')
  }
  const beginPress = (button, point, input, id) => {
    cancelPress()
    const pending = { button, x: point.clientX, y: point.clientY, input, id, shown: false, timer: null }
    pending.timer = win.setTimeout(() => { hold(pending) }, 550)
    press = pending
  }
  const endPress = () => {
    if (press?.shown) suppressClick = press.button
    cancelPress()
  }
  const movePress = point => {
    if (press && Math.hypot(point.clientX - press.x, point.clientY - press.y) > 10) { cancelPress(); hide() }
  }
  listen(doc, 'pointerdown', event => {
    keyboard = false
    hovered = focused = null
    suppressClick = null
    hide()
    cancelPress()
    const button = action(event)
    if (!button || event.pointerType !== 'touch' || event.isPrimary === false) return
    beginPress(button, event, 'pointer', event.pointerId)
  }, { capture: true, passive: true })
  listen(doc, 'pointermove', event => {
    if (press?.input === 'pointer' && press.id === event.pointerId) movePress(event)
  }, { passive: true })
  listen(doc, 'pointerup', () => {
    if (press?.input === 'pointer') endPress()
  }, { capture: true, passive: true })
  listen(doc, 'pointercancel', () => {
    // Touch streams can continue after the browser cancels pointer events for
    // a native hold gesture. Let touchend/touchcancel own that stream.
    if (press?.input === 'touch') return
    endPress()
    if (tooltipSource !== 'touch') hide()
  }, { passive: true })
  listen(doc, 'touchstart', event => {
    const button = action(event)
    if (event.touches.length !== 1) { cancelPress(); hide(); return }
    if (!button) return
    keyboard = false
    beginPress(button, event.touches[0], 'touch', event.touches[0].identifier)
  }, { capture: true, passive: true })
  listen(doc, 'touchmove', event => {
    if (press?.input !== 'touch') return
    const point = [...event.touches].find(touch => touch.identifier === press.id)
    if (point) movePress(point)
  }, { capture: true, passive: true })
  listen(doc, 'touchend', event => {
    if (press?.input === 'touch' && [...event.changedTouches].some(touch => touch.identifier === press.id)) endPress()
  }, { capture: true, passive: true })
  listen(doc, 'touchcancel', () => {
    endPress()
    if (tooltipSource !== 'touch') hide()
  }, { passive: true })
  listen(doc, 'contextmenu', event => {
    const button = action(event)
    if (!button) return
    event.preventDefault()
    // Some mobile browsers recognize long press before our timer fires.
    if (press?.button === button) hold(press)
  })
  const closeAction = button => {
    keyboard = false
    hovered = focused = null
    dismissing = true
    try {
      // Use the host's dismissal path rather than mutating aria-expanded or
      // removing a React-owned portal. This also cancels its hover timers.
      button.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
    } finally { dismissing = false }
  }
  listen(doc, 'click', event => {
    const button = action(event)
    if (button && button === suppressClick) {
      event.preventDefault()
      event.stopImmediatePropagation()
      suppressClick = null
    } else {
      hide()
      if (button && button.getAttribute('data-dmf-action') !== 'jobs' && button.getAttribute('aria-expanded') === 'true') {
        event.preventDefault()
        event.stopImmediatePropagation()
        closeAction(button)
      }
    }
  }, { capture: true })
  listen(doc, 'keydown', event => {
    if (dismissing) return
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
