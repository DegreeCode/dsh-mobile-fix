// Check that the Harness structure this plugin relies on still exists in a DeepSeek Harness checkout.
// Usage: node scripts/check-upstream.mjs <dsh-checkout>
//
// - every CSS-module local name matched by `[class*="_name"]` in src/mobile.css is declared by some
//   packages/client/**/*.module.css,
// - the DOM attributes the runtime reads are still rendered,
// - ctx.layout still offers toggleSidebar() and panelInfo, and the frame still switches to its
//   narrow (auto-collapsed) sidebar above the 767px breakpoint used here.
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const dsh = resolve(process.argv[2] ?? '.')
const client = join(dsh, 'packages/client')

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'lib' || entry.name === 'dist' || entry.name === 'tests') continue
    const path = join(dir, entry.name)
    if (entry.isDirectory()) yield* walk(path)
    else yield path
  }
}

const declared = new Map()
let sources = ''
for (const file of walk(client)) {
  if (file.endsWith('.module.css')) {
    const css = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
    for (const [, name] of css.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) {
      if (!declared.has(name)) declared.set(name, new Set())
      declared.get(name).add(relative(client, file).split('/')[0])
    }
  } else if (/\.(tsx?|jsx?)$/.test(file)) {
    sources += readFileSync(file, 'utf8')
  }
}

const problems = []
const report = []

const css = readFileSync(join(root, 'src/mobile.css'), 'utf8')
const names = [...new Set([...css.matchAll(/\[class\*="_([\w-]+)"\]/g)].map(match => match[1]))].sort()
for (const name of names) {
  const owners = declared.get(name)
  if (owners) report.push(`  .${name}  ${[...owners].sort().join(', ')}`)
  else problems.push(`class .${name} is not declared by any packages/client/**/*.module.css`)
}

const runtime = readFileSync(join(root, 'src/runtime.js'), 'utf8')
const attributes = [...new Set([...`${css}\n${runtime}`.matchAll(/\b(data-(?!dmf)[a-z-]+)/g)].map(match => match[1]))].sort()
for (const attribute of attributes) {
  if (!sources.includes(attribute)) problems.push(`attribute ${attribute} is not rendered by packages/client`)
  else report.push(`  [${attribute}]`)
}

const service = readFileSync(join(client, 'ui-layout/src/client/service.ts'), 'utf8')
for (const member of ['toggleSidebar(): void', 'readonly panelInfo: HostObservable<PanelInfo>']) {
  if (!service.includes(member)) problems.push(`ILayout no longer declares \`${member}\` (ui-layout/src/client/service.ts)`)
}
const columns = readFileSync(join(client, 'ui-layout/src/client/columns.ts'), 'utf8')
const autoCollapse = Number(columns.match(/export const SIDEBAR_AUTO_COLLAPSE = (\d+)/)?.[1])
if (!(autoCollapse >= 768)) problems.push(`SIDEBAR_AUTO_COLLAPSE is ${autoCollapse}; the drawer needs the narrow sidebar mode at <=767px`)

let revision = ''
try { revision = readFileSync(join(dsh, 'package.json'), 'utf8').match(/"version":\s*"([^"]+)"/)?.[1] ?? '' } catch {}
console.log(`DeepSeek Harness ${revision} at ${dsh}`)
console.log(`${names.length} class names, ${attributes.length} attributes, SIDEBAR_AUTO_COLLAPSE=${autoCollapse}`)
for (const line of report) console.log(line)
if (problems.length > 0) {
  for (const problem of problems) console.error(`::error::${problem}`)
  process.exit(1)
}
console.log('upstream structure matches')
