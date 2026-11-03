import z from '@deepseek-ai/schemastery'

/** Live preference persisted in the Host user-settings document. */
export const Config = z.object({
  iconOnlyHeader: z.boolean().default(true).volatile(),
})

export function apply(ctx) {
  ctx.inject(['settings'], scope => {
    scope.effect(() => scope.settings.configure({ auto: false }, ctx.fiber))
  })
}
