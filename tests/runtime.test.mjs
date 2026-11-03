// Runtime behaviour of client.js on a DOM shaped like the Harness AppFrame (node --test, jsdom).
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import * as React from 'react'

const CLIENT = readFileSync(new URL('../client.js', import.meta.url), 'utf8')

const FRAME = `
  <div class="pI_x6G_frame" data-sidebar-collapsed="true">
    <div class="pI_x6G_sidebarCol">
      <div class="hHd-Xa_root">
        <button class="hHd-Xa_newSession">New session</button>
        <div role="tree">
          <div role="treeitem" class="YDXeBa_sessionRow" data-row-key="session:a"><span class="YDXeBa_title">A</span><button class="YDXeBa_iconButton">pin</button></div>
          <div role="treeitem" class="YDXeBa_projectRow" data-row-key="workspace:w"><span>W</span></div>
        </div>
        <input class="bhn1Oq_search">
      </div>
    </div>
    <div class="pI_x6G_centerCol"></div>
    <div class="pI_x6G_rightbarCol"></div>
    <div class="pI_x6G_bottomRow" data-shell-bottom></div>
  </div>`

const ACTIONS = `<header><div class="host_titleRow"><div class="host_titleCluster">
  <nav class="host_crumbs">Session</nav><div class="host_headerActions">
  <div data-slot="conversation.session.header.actions">
    <div><button id="team" class="team_trigger" aria-label="에이전트 팀" aria-expanded="false"><svg></svg><span class="team_triggerLabel">에이전트 팀</span></button></div>
    <div><button id="subagents" class="sub_trigger" aria-haspopup="tree" aria-label="서브에이전트 8개" aria-expanded="false"><span>8 agents</span><svg></svg></button></div>
    <div><button id="jobs" class="jobs_trigger" aria-label="백그라운드 작업 3개 실행 중" aria-expanded="false"><span class="jobs_triggerDot"></span><span class="jobs_count">백그라운드 작업 3개 실행 중</span><svg></svg></button></div>
    <button id="other">Other action</button>
  </div></div></div><div class="host_headerUtilities"></div><div class="host_headerCorner"></div></div></header>`
const ACTION_FRAME = FRAME.replace('<div class="pI_x6G_centerCol"></div>', `<div class="pI_x6G_centerCol">${ACTIONS}</div>`)

/** Load client.js into a fresh page and apply it through a minimal cordis-like context. */
function setup({ mobile = true, platform, body = FRAME, viewport = { height: 844, scale: 1 }, enabled = true } = {}) {
  const dom = new JSDOM(`<!doctype html><html lang="ko"${platform ? ` data-platform="${platform}"` : ''}><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body>${body}</body></html>`, { pretendToBeVisual: true, runScripts: 'outside-only' })
  const { window } = dom
  const mediaListeners = new Set()
  const media = { matches: mobile, addEventListener: (_, fn) => mediaListeners.add(fn), removeEventListener: (_, fn) => mediaListeners.delete(fn) }
  window.matchMedia = () => media
  const visualViewport = viewport === null ? null : Object.assign(new window.EventTarget(), viewport)
  Object.defineProperty(window, 'visualViewport', { value: visualViewport, configurable: true })

  const frame = () => window.document.querySelector('[data-shell-bottom]')?.parentElement
  let panel = null
  const panelListeners = new Set()
  const layout = {
    toggles: 0,
    // AppFrame publishes the narrow collapse state as data-sidebar-collapsed.
    toggleSidebar() { this.toggles++; frame()?.toggleAttribute('data-sidebar-collapsed') },
    panelInfo: {
      getSnapshot: () => ({ activePanelId: panel }),
      subscribe: fn => { panelListeners.add(fn); return () => panelListeners.delete(fn) },
    },
  }
  const selectPanel = id => { panel = id; for (const fn of panelListeners) fn() }

  let module
  const Switch = props => React.createElement('button', {
    role: 'switch', 'aria-label': props.label, 'aria-checked': props.checked,
    disabled: props.disabled, onClick: () => props.onChange(!props.checked),
  })
  const require = name => {
    if (name === 'react') return React
    if (name === '@deepseek-ai/dsh-client-ui-primitives') return { Switch }
    throw new Error(`Unexpected module: ${name}`)
  }
  window.__ModuleLoader__ = { load: spec => { module = { id: spec.id, ...spec.factory(require) } } }
  window.eval(CLIENT)
  const effects = []
  const settingListeners = new Set()
  let setting = { status: 'ready', writable: true, value: { iconOnlyHeader: enabled } }
  const form = {
    getSnapshot: () => setting,
    subscribe: listener => { settingListeners.add(listener); return () => settingListeners.delete(listener) },
    async set(field, value) {
      assert.equal(field, 'iconOnlyHeader')
      if (form.failure) throw new Error('write failed')
      if (form.refuse) return false
      updateSetting({ value: { iconOnlyHeader: value } })
      return true
    },
  }
  const updateSetting = next => { setting = { ...setting, ...next }; for (const listener of settingListeners) listener() }
  const rows = []
  const effect = (fn, label) => { const dispose = fn(); effects.push({ dispose, label }); return dispose }
  module.apply({ layout, effect,
    configForms: { get: id => { assert.equal(id, 'dsh-mobile-fix'); return form } },
    locale: { register: () => () => {} },
    slots: {
      inject: (name, register) => { assert.equal(name, 'settings.general.item'); effect(register) },
      register: (options, component) => { rows.push({ options, component }); return () => { rows.pop() } },
    },
  })
  const dispose = () => { for (const effect of [...effects].reverse()) effect.dispose() }
  const flush = () => new Promise(resolve => window.setTimeout(resolve, 0))
  const html = window.document.documentElement
  return { window, document: window.document, html, module, layout, selectPanel, dispose, flush, frame, media, mediaListeners, panelListeners, visualViewport, form, updateSetting, settingListeners, rows }
}

test('registers as dsh-mobile-fix and injects layout and native settings services', () => {
  const { module, document } = setup()
  assert.equal(module.id, 'dsh-mobile-fix')
  assert.deepEqual([...module.inject], ['layout', 'slots', 'locale', 'configForms'])
  assert.ok(document.querySelector('style[data-dmf-style]').textContent.includes('_sidebarCol'))
})

test('menu button opens the drawer and the backdrop closes it', async () => {
  const { document, html, layout, flush } = setup()
  const menu = document.querySelector('[data-dmf-menu]')
  assert.equal(menu.getAttribute('aria-label'), '사이드바 열기')
  assert.equal(html.hasAttribute('data-dmf-drawer'), false)

  menu.click()
  await flush()
  assert.equal(layout.toggles, 1)
  assert.equal(html.hasAttribute('data-dmf-drawer'), true)
  assert.equal(menu.getAttribute('aria-expanded'), 'true')

  menu.click() // already open: no second toggle
  assert.equal(layout.toggles, 1)

  document.querySelector('[data-dmf-backdrop]').click()
  await flush()
  assert.equal(layout.toggles, 2)
  assert.equal(html.hasAttribute('data-dmf-drawer'), false)
})

test('choosing a session or a new session closes the drawer; row actions do not', async () => {
  const { document, layout, flush, frame } = setup()
  document.querySelector('[data-dmf-menu]').click()

  document.querySelector('.YDXeBa_iconButton').click()
  await flush()
  assert.equal(frame().hasAttribute('data-sidebar-collapsed'), false, 'pin button keeps the drawer open')

  document.querySelector('.YDXeBa_projectRow').click()
  await flush()
  assert.equal(frame().hasAttribute('data-sidebar-collapsed'), false, 'workspace row keeps the drawer open')

  document.querySelector('.YDXeBa_title').click()
  await flush()
  assert.equal(frame().hasAttribute('data-sidebar-collapsed'), true)

  document.querySelector('[data-dmf-menu]').click()
  document.querySelector('.hHd-Xa_newSession').click()
  await flush()
  assert.equal(frame().hasAttribute('data-sidebar-collapsed'), true)
  assert.equal(layout.toggles, 4)
})

test('Escape closes the drawer unless a field or menu consumes it', async () => {
  const { window, document, frame } = setup()
  const escape = target => target.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  document.querySelector('[data-dmf-menu]').click()

  escape(document.querySelector('.bhn1Oq_search'))
  assert.equal(frame().hasAttribute('data-sidebar-collapsed'), false)

  const menu = document.body.appendChild(document.createElement('div'))
  menu.setAttribute('role', 'menu')
  escape(document.body)
  assert.equal(frame().hasAttribute('data-sidebar-collapsed'), false)
  menu.remove()

  escape(document.body)
  assert.equal(frame().hasAttribute('data-sidebar-collapsed'), true)
})

test('panel navigation closes the drawer and marks full-page panels', async () => {
  const { html, selectPanel, frame, document, flush } = setup()
  document.querySelector('[data-dmf-menu]').click()
  selectPanel('plugins')
  await flush()
  assert.equal(frame().hasAttribute('data-sidebar-collapsed'), true)
  assert.equal(html.hasAttribute('data-dmf-panel'), true)
  selectPanel(null)
  assert.equal(html.hasAttribute('data-dmf-panel'), false)
})

test('edge swipe opens and a left swipe on the drawer closes', async () => {
  const { window, document, frame } = setup()
  const touch = (type, target, x, y) => {
    const event = new window.Event(type, { bubbles: true })
    const point = [{ clientX: x, clientY: y }]
    Object.assign(event, { touches: type === 'touchend' ? [] : point, changedTouches: point })
    target.dispatchEvent(event)
  }
  touch('touchstart', document.querySelector('.pI_x6G_centerCol'), 10, 300)
  touch('touchend', document.querySelector('.pI_x6G_centerCol'), 120, 310)
  assert.equal(frame().hasAttribute('data-sidebar-collapsed'), false)

  touch('touchstart', document.querySelector('.YDXeBa_projectRow'), 200, 300)
  touch('touchend', document.querySelector('.YDXeBa_projectRow'), 60, 305)
  assert.equal(frame().hasAttribute('data-sidebar-collapsed'), true)

  // A vertical scroll that started at the edge is not a swipe.
  touch('touchstart', document.querySelector('.pI_x6G_centerCol'), 10, 100)
  touch('touchend', document.querySelector('.pI_x6G_centerCol'), 90, 400)
  assert.equal(frame().hasAttribute('data-sidebar-collapsed'), true)
})

test('desktop widths leave the sidebar alone', () => {
  const { document, layout, html } = setup({ mobile: false })
  document.querySelector('[data-dmf-menu]').click()
  assert.equal(layout.toggles, 0)
  assert.equal(html.style.getPropertyValue('--dmf-viewport-height'), '')
})

test('app height follows the visible viewport when the keyboard opens and closes', () => {
  const { window, html, visualViewport } = setup()
  const height = () => html.style.getPropertyValue('--dmf-viewport-height')
  assert.equal(height(), '844px')
  visualViewport.height = 510
  visualViewport.dispatchEvent(new window.Event('resize'))
  assert.equal(height(), '510px')
  visualViewport.height = 844
  visualViewport.dispatchEvent(new window.Event('resize'))
  assert.equal(height(), '844px')
  visualViewport.height = 0 // Ignore transient invalid measurements.
  visualViewport.dispatchEvent(new window.Event('resize'))
  assert.equal(height(), '844px')
})

test('pinch zoom does not resize the app', () => {
  const { window, html, visualViewport } = setup()
  Object.assign(visualViewport, { height: 422, scale: 2 })
  visualViewport.dispatchEvent(new window.Event('resize'))
  window.dispatchEvent(new window.Event('resize'))
  assert.equal(html.style.getPropertyValue('--dmf-viewport-height'), '844px')
})

test('window height is the fallback when VisualViewport is unavailable', () => {
  const { window, html } = setup({ viewport: null })
  window.innerHeight = 510
  window.dispatchEvent(new window.Event('resize'))
  assert.equal(html.style.getPropertyValue('--dmf-viewport-height'), '510px')
})

test('viewport height is released at desktop widths and reapplied on mobile', () => {
  const { window, html, media, mediaListeners, visualViewport } = setup()
  media.matches = false
  for (const listener of mediaListeners) listener()
  assert.equal(html.style.getPropertyValue('--dmf-viewport-height'), '')
  visualViewport.height = 700
  visualViewport.dispatchEvent(new window.Event('resize'))
  assert.equal(html.style.getPropertyValue('--dmf-viewport-height'), '')
  media.matches = true
  for (const listener of mediaListeners) listener()
  assert.equal(html.style.getPropertyValue('--dmf-viewport-height'), '700px')
})

test('macOS and Windows desktop shells are not touched', () => {
  const { html, document } = setup({ platform: 'darwin' })
  assert.equal(html.hasAttribute('data-dmf'), false)
  assert.equal(document.querySelector('[data-dmf-menu]'), null)
  assert.equal(document.querySelector('style[data-dmf-style]'), null)
})

test('extends the viewport meta and undoes everything on dispose', () => {
  const { window, html, document, dispose, panelListeners, mediaListeners, visualViewport } = setup()
  const meta = document.querySelector('meta[name="viewport"]')
  assert.equal(meta.content, 'width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content')
  dispose()
  assert.equal(meta.content, 'width=device-width, initial-scale=1')
  assert.equal(html.hasAttribute('data-dmf'), false)
  assert.equal(document.querySelector('[data-dmf-menu], [data-dmf-backdrop], style[data-dmf-style]'), null)
  assert.equal(panelListeners.size, 0)
  assert.equal(mediaListeners.size, 0)
  assert.equal(html.style.getPropertyValue('--dmf-viewport-height'), '')
  visualViewport.height = 510
  visualViewport.dispatchEvent(new window.Event('resize'))
  window.dispatchEvent(new window.Event('resize'))
  assert.equal(html.style.getPropertyValue('--dmf-viewport-height'), '')
})

test('icon mode decorates known actions and retains host labels, counts and handlers', async () => {
  const { html, document, dispose, settingListeners, rows } = setup({ body: ACTION_FRAME })
  assert.equal(html.hasAttribute('data-dmf-icons'), true)
  assert.equal(document.querySelectorAll('button[data-dmf-action]').length, 3)
  assert.equal(document.querySelector('#subagents [data-dmf-action-count]').textContent, '8')
  assert.equal(document.querySelector('#jobs [data-dmf-action-count]').textContent, '3')
  assert.equal(document.querySelector('#jobs').getAttribute('aria-label'), '백그라운드 작업 3개 실행 중')
  assert.equal(document.querySelector('#other').hasAttribute('data-dmf-action'), false)
  const button = document.querySelector('#jobs')
  let clicks = 0
  button.addEventListener('click', () => { clicks++ })
  button.click()
  assert.equal(clicks, 1)
  assert.equal(rows[0].options.name, 'settings.general.item')
  assert.equal(rows[0].options.locale, 'mobileFix')
  dispose()
  assert.equal(settingListeners.size, 0)
  assert.equal(rows.length, 0)
  assert.equal(html.hasAttribute('data-dmf-icons'), false)
  assert.equal(document.querySelector('[data-dmf-action-icon], [data-dmf-action-count], [data-dmf-action]'), null)
  button.click()
  assert.equal(clicks, 2)
})

test('saved preference and desktop widths restore the original buttons', async () => {
  const { window, html, document, form, updateSetting, media, mediaListeners, flush } = setup({ body: ACTION_FRAME, enabled: false })
  assert.equal(document.querySelector('[data-dmf-action]'), null)
  await form.set('iconOnlyHeader', true)
  await flush()
  assert.equal(document.querySelectorAll('[data-dmf-action-icon]').length, 3)
  media.matches = false
  for (const listener of mediaListeners) listener()
  assert.equal(html.hasAttribute('data-dmf-icons'), false)
  assert.equal(document.querySelector('[data-dmf-action]'), null)
  media.matches = true
  for (const listener of mediaListeners) listener()
  assert.equal(document.querySelectorAll('[data-dmf-action-icon]').length, 3)
  updateSetting({ value: { iconOnlyHeader: false } }) // Host changes from another browser.
  await flush()
  assert.equal(document.querySelector('[data-dmf-action]'), null)
  assert.ok(document.querySelector('.jobs_count').textContent.includes('3'))
})

test('live count and label changes update badges and an open tooltip', async () => {
  const { document, flush } = setup({ body: ACTION_FRAME })
  const button = document.querySelector('#jobs')
  button.focus()
  const tooltip = document.querySelector('[role="tooltip"]')
  assert.equal(tooltip.textContent, '백그라운드 작업 3개 실행 중')
  assert.equal(button.getAttribute('aria-describedby'), tooltip.id)
  button.querySelector('.jobs_count').textContent = '백그라운드 작업 123개 실행 중'
  button.setAttribute('aria-label', '백그라운드 작업 123개 실행 중')
  await flush()
  assert.equal(button.querySelector('[data-dmf-action-count]').textContent, '99+')
  assert.equal(tooltip.textContent, '백그라운드 작업 123개 실행 중')
  button.setAttribute('aria-expanded', 'true')
  await flush()
  assert.equal(tooltip.hidden, true)
  assert.equal(button.hasAttribute('aria-describedby'), false)
})

test('session replacement releases old decorations and handles newly mounted headers', async () => {
  const { document, flush } = setup({ body: ACTION_FRAME })
  const old = document.querySelector('#jobs')
  document.querySelector('.pI_x6G_centerCol').innerHTML = ACTIONS
  await flush()
  assert.equal(old.hasAttribute('data-dmf-action'), false)
  assert.equal(document.querySelectorAll('[data-dmf-action-icon]').length, 3)
  assert.equal(document.querySelector('#jobs').getAttribute('data-dmf-action'), 'jobs')
})

test('mouse hover and keyboard focus show explanations without opening actions', async () => {
  const { window, document } = setup({ body: ACTION_FRAME })
  const button = document.querySelector('#team')
  const pointer = (type, target, extra = {}) => {
    const event = new window.Event(type, { bubbles: true, cancelable: true })
    Object.assign(event, { pointerType: 'mouse', ...extra })
    target.dispatchEvent(event)
  }
  pointer('pointerover', button)
  await new Promise(resolve => window.setTimeout(resolve, 430))
  const tooltip = document.querySelector('[role="tooltip"]')
  assert.equal(tooltip.hidden, false)
  assert.equal(tooltip.textContent, '에이전트 팀')
  pointer('pointerout', button)
  assert.equal(tooltip.hidden, true)
  button.focus()
  assert.equal(tooltip.hidden, false)
  document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  assert.equal(tooltip.hidden, true)
})

test('long press explains an icon, suppresses its release click, and leaves the next tap usable', async () => {
  const { window, document } = setup({ body: ACTION_FRAME })
  const button = document.querySelector('#jobs')
  let clicks = 0
  button.addEventListener('click', () => { clicks++ })
  const pointer = type => {
    const event = new window.Event(type, { bubbles: true, cancelable: true })
    Object.assign(event, { pointerType: 'touch', clientX: 100, clientY: 30 })
    button.dispatchEvent(event)
  }
  pointer('pointerdown')
  button.focus() // Pointer focus must not show the tooltip before the hold.
  assert.equal(document.querySelector('[role="tooltip"]'), null)
  await new Promise(resolve => window.setTimeout(resolve, 580))
  assert.equal(document.querySelector('[role="tooltip"]').hidden, false)
  pointer('pointerup')
  button.click()
  assert.equal(clicks, 0)
  assert.equal(document.querySelector('[role="tooltip"]').hidden, false)
  pointer('pointerdown')
  pointer('pointerup')
  button.click()
  assert.equal(clicks, 1)
  assert.equal(document.querySelector('[role="tooltip"]').hidden, true)
})

test('a scrolling gesture cancels long press, and disposal cancels pending tooltips', async () => {
  const { window, document, dispose } = setup({ body: ACTION_FRAME })
  const button = document.querySelector('#jobs')
  const pointer = (type, x) => {
    const event = new window.Event(type, { bubbles: true })
    Object.assign(event, { pointerType: 'touch', clientX: x, clientY: 30 })
    button.dispatchEvent(event)
  }
  pointer('pointerdown', 100)
  pointer('pointermove', 120)
  await new Promise(resolve => window.setTimeout(resolve, 580))
  assert.equal(document.querySelector('[role="tooltip"]'), null)
  pointer('pointerdown', 100)
  dispose()
  await new Promise(resolve => window.setTimeout(resolve, 580))
  assert.equal(document.querySelector('[role="tooltip"]'), null)
})
