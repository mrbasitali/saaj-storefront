export default defineNuxtPlugin(() => {
  const { initTheme } = useStorefrontTheme()
  initTheme()
})
