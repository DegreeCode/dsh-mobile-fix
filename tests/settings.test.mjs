import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Config, apply } from '../index.js'
import { createHeaderPreference, createHeaderSettingsRow, SETTINGS_COPY } from '../src/settings.js'

function host({ status = 'ready', writable = true, value } = {}) {
  let snapshot = { status, writable, value }
  const listeners = new Set()
  const form = {
    getSnapshot: () => snapshot,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) },
    async set(field, enabled) {
      assert.equal(field, 'iconOnlyHeader')
      if (form.fail) throw new Error('offline')
      if (form.refuse) return false
      form.update({ value: { iconOnlyHeader: enabled } })
      return true
    },
    update(next) { snapshot = { ...snapshot, ...next }; for (const listener of listeners) listener() },
  }
  return { form, listeners }
}

test('the Host exposes a live icon preference defaulting to true through its native settings', () => {
  assert.equal(Config.dict.iconOnlyHeader.type, 'boolean')
  assert.equal(Config.dict.iconOnlyHeader.meta.default, true)
  assert.equal(Config.dict.iconOnlyHeader.meta.volatile, true)
  let registered = false
  let disposed = false
  const fiber = {}
  const cleanups = []
  apply({ fiber, inject(keys, callback) {
    assert.deepEqual(keys, ['settings'])
    callback({ settings: { configure(options, owner) {
      assert.deepEqual(options, { auto: false })
      assert.equal(owner, fiber)
      registered = true
      return () => { disposed = true }
    } }, effect: fn => { cleanups.push(fn()) } })
  } })
  assert.equal(registered, true)
  for (const cleanup of cleanups) cleanup()
  assert.equal(disposed, true)
})

test('preference uses Host acceptance, survives a new controller and follows external changes', async () => {
  const { form, listeners } = host()
  let preference = createHeaderPreference(form)
  assert.equal(preference.getSnapshot().enabled, true)
  await preference.setEnabled(false)
  assert.equal(preference.getSnapshot().enabled, false)
  preference.dispose()
  assert.equal(listeners.size, 0)
  preference = createHeaderPreference(form)
  assert.equal(preference.getSnapshot().enabled, false)
  form.update({ value: { iconOnlyHeader: true } })
  assert.equal(preference.getSnapshot().enabled, true)
  const stable = preference.getSnapshot()
  form.update({ value: { iconOnlyHeader: true } })
  assert.equal(preference.getSnapshot(), stable)
  preference.dispose()
})

test('failed and refused writes keep the accepted value and allow retry', async () => {
  const { form } = host()
  const preference = createHeaderPreference(form)
  for (const failure of ['fail', 'refuse']) {
    form[failure] = true
    await preference.setEnabled(false)
    assert.equal(preference.getSnapshot().enabled, true)
    assert.equal(preference.getSnapshot().failed, true)
    assert.equal(preference.getSnapshot().busy, false)
    form[failure] = false
  }
  await preference.setEnabled(false)
  assert.equal(preference.getSnapshot().enabled, false)
  assert.equal(preference.getSnapshot().failed, false)
  preference.dispose()
})

test('settings row is translated, disabled while loading or locked, and exposes save failures', async () => {
  const { form } = host({ status: 'loading', writable: false })
  const preference = createHeaderPreference(form)
  const Switch = props => React.createElement('button', {
    role: 'switch', disabled: props.disabled, 'aria-checked': props.checked, 'aria-label': props.label,
  })
  const Row = createHeaderSettingsRow(React, Switch, preference)
  for (const language of Object.keys(SETTINGS_COPY)) {
    const t = key => SETTINGS_COPY[language][key]
    const markup = renderToStaticMarkup(React.createElement(Row, { t }))
    assert.ok(markup.includes(t('title')))
    assert.ok(markup.includes('disabled=""'))
    assert.ok(markup.includes('aria-checked="true"'))
  }
  await preference.setEnabled(false)
  assert.equal(preference.getSnapshot().enabled, true)
  form.update({ status: 'ready', writable: true })
  form.fail = true
  await preference.setEnabled(false)
  const markup = renderToStaticMarkup(React.createElement(Row, { t: key => SETTINGS_COPY.ko[key] }))
  assert.ok(markup.includes('role="alert"'))
  assert.ok(markup.includes(SETTINGS_COPY.ko.error))
  preference.dispose()
})
