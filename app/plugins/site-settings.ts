export default defineNuxtPlugin(async () => {
  const siteSettings = useSiteSettingsStore()

  await siteSettings.fetch()
})
