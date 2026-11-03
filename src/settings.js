// This module is inlined into the client factory; React and Switch come from
// the Harness platform table, sharing the host's React instance.
export const SETTINGS_NAMESPACE = 'mobileFix'
export const SETTINGS_COPY = {
  ko: {
    title: '상단 작업 버튼을 아이콘으로 표시',
    description: '모바일에서 에이전트 팀·서브에이전트·백그라운드 작업을 아이콘으로 표시합니다. 끄면 텍스트를 함께 표시합니다.',
    error: '설정을 저장하지 못했습니다. 다시 시도하세요.',
    team: '에이전트 팀', subagents: '서브에이전트', jobs: '백그라운드 작업',
  },
  en: {
    title: 'Show header actions as icons',
    description: 'Use icons for agent teams, subagents and background jobs on mobile. Turn off to show text labels.',
    error: 'Could not save this setting. Please try again.',
    team: 'Agent teams', subagents: 'Subagents', jobs: 'Background jobs',
  },
  zh: {
    title: '将顶部操作显示为图标',
    description: '在移动端以图标显示智能体团队、子智能体和后台任务。关闭后显示文字标签。',
    error: '无法保存设置，请重试。',
    team: '智能体团队', subagents: '子智能体', jobs: '后台任务',
  },
  ja: {
    title: '上部の操作をアイコンで表示',
    description: 'モバイルでエージェントチーム・サブエージェント・バックグラウンドジョブをアイコンで表示します。オフにすると文字も表示します。',
    error: '設定を保存できませんでした。もう一度お試しください。',
    team: 'エージェントチーム', subagents: 'サブエージェント', jobs: 'バックグラウンドジョブ',
  },
}

/** One shared preference source for the settings row and all session headers. */
export function createHeaderPreference(form) {
  const listeners = new Set()
  let busy = false
  let failed = false
  let snapshot
  const sync = () => {
    const host = form.getSnapshot()
    const next = {
      enabled: host.value?.iconOnlyHeader !== false,
      writable: host.status === 'ready' && host.writable,
      busy, failed,
    }
    if (snapshot && Object.keys(next).every(key => next[key] === snapshot[key])) return
    snapshot = next
    for (const listener of listeners) listener()
  }
  sync()
  const unsubscribe = form.subscribe(sync)
  return {
    getSnapshot: () => snapshot,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) },
    async setEnabled(enabled) {
      if (busy || !snapshot.writable) return
      busy = true
      failed = false
      sync()
      try { failed = !await form.set('iconOnlyHeader', enabled) }
      catch { failed = true }
      finally { busy = false; sync() }
    },
    dispose() { unsubscribe(); listeners.clear() },
  }
}

export function createHeaderSettingsRow(React, Switch, preference) {
  const h = React.createElement
  return function HeaderSettingsRow({ t }) {
    const state = React.useSyncExternalStore(preference.subscribe, preference.getSnapshot, preference.getSnapshot)
    return h('div', { 'data-dmf-setting': '' },
      h('div', null,
        h('div', { 'data-dmf-setting-title': '' }, t('title')),
        h('div', { 'data-dmf-setting-description': '' }, t('description')),
        state.failed ? h('div', { role: 'alert' }, t('error')) : null),
      h(Switch, {
        checked: state.enabled, disabled: state.busy || !state.writable,
        label: t('title'), onChange: enabled => { void preference.setEnabled(enabled) },
      }))
  }
}
