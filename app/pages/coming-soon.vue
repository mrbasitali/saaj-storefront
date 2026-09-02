<script setup lang="ts">
definePageMeta({ layout: false })

useSeoMeta({
  title: 'SAAJ — A new online experience is taking shape',
  description: 'The SAAJ online store is being renewed. We will be back with a new shopping experience soon.',
  robots: 'noindex, nofollow',
})

const siteSettings = useSiteSettingsStore()
const { $api } = useNuxtApp()
const { currentYear } = useStorefrontDateTime()

type MaintenanceStatus = {
  checkedAt: number
  enabled: boolean
  type: 'maintenance' | 'coming_soon' | 'custom' | ''
  title: string
  message: string
}

const status = useState<MaintenanceStatus>('maintenance-status', () => ({
  checkedAt: 0,
  enabled: true,
  type: 'maintenance',
  title: '',
  message: '',
}))

const checking = ref(false)
let statusTimer: ReturnType<typeof setInterval> | null = null

const fallbackStatus: MaintenanceStatus = {
  checkedAt: Date.now(),
  enabled: true,
  type: 'maintenance',
  title: 'A new SAAJ is taking shape.',
  message: 'Our previous online store is temporarily offline while we prepare the next SAAJ experience.',
}

const logoUrl = computed(() => (
  siteSettings.settings?.logos.navbar_light
  || siteSettings.settings?.logos.footer_light
  || null
))

const contactEmail = computed(() => siteSettings.settings?.contact.email || null)

const socialLinks = computed(() => Object.entries(siteSettings.settings?.social_links || {})
  .filter(([, url]) => Boolean(url))
  .slice(0, 5)
  .map(([platform, url]) => ({ platform, url })))

const displayTitle = computed(() => {
  if (status.value.type === 'custom' && status.value.title) return status.value.title
  return 'Same SAAJ. A new online home.'
})

const displayMessage = computed(() => {
  if (status.value.type === 'custom' && status.value.message) return status.value.message

  return 'We’re rebuilding our online store with a more considered look and a better way to discover and shop SAAJ. The previous website is temporarily offline while we prepare the new experience.'
})

const statusUpdate = computed(() => {
  if (status.value.type === 'custom') return null

  const title = status.value.title?.trim()
  const message = status.value.message?.trim()

  if (!title && !message) return null

  return {
    title: title || 'Website update in progress',
    message: message || null,
  }
})

async function checkMaintenanceStatus(redirectWhenLive = true) {
  if (checking.value) return

  checking.value = true

  try {
    const response = await $api<{
      enabled: boolean
      type: MaintenanceStatus['type']
      title: string
      message: string
    }>('/maintenance-status')

    status.value = {
      checkedAt: Date.now(),
      ...response,
    }

    if (!response.enabled && redirectWhenLive) {
      await navigateTo('/', { replace: true })
    }
  } catch {
    status.value = fallbackStatus
  } finally {
    checking.value = false
  }
}

await checkMaintenanceStatus(true)

onMounted(() => {
  statusTimer = setInterval(() => {
    void checkMaintenanceStatus(true)
  }, 20_000)
})

onBeforeUnmount(() => {
  if (statusTimer) clearInterval(statusTimer)
})
</script>

<template>
  <main class="relaunch-page">
    <div class="relaunch-shell">
      <header class="relaunch-header">
        <div class="relaunch-logo-wrap">
          <img
            v-if="logoUrl"
            :src="logoUrl"
            alt="SAAJ"
            class="relaunch-logo"
          >
          <span v-else class="relaunch-wordmark">SAAJ</span>
        </div>

        <div class="relaunch-status">
          <span class="relaunch-status-dot" />
          <span>New website in progress</span>
        </div>
      </header>

      <div class="relaunch-grid">
        <section class="relaunch-copy">
          <div class="relaunch-copy-inner">
            <p class="relaunch-kicker">A new chapter online</p>

            <h1>{{ displayTitle }}</h1>

            <p class="relaunch-intro">
              {{ displayMessage }}
            </p>

            <div
              v-if="statusUpdate"
              class="relaunch-update"
            >
              <span class="relaunch-update-label">Current update</span>
              <div>
                <p class="relaunch-update-title">{{ statusUpdate.title }}</p>
                <p
                  v-if="statusUpdate.message"
                  class="relaunch-update-message"
                >
                  {{ statusUpdate.message }}
                </p>
              </div>
            </div>

            <div class="relaunch-actions">
              <button
                type="button"
                class="relaunch-check"
                :disabled="checking"
                @click="checkMaintenanceStatus(true)"
              >
                <span>{{ checking ? 'Checking store' : 'Check if we’re back' }}</span>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                  aria-hidden="true"
                >
                  <path d="M5 12h14M14 7l5 5-5 5" />
                </svg>
              </button>

              <a
                v-if="contactEmail"
                :href="`mailto:${contactEmail}`"
                class="relaunch-contact"
              >
                Contact SAAJ
              </a>
            </div>
          </div>
        </section>

        <aside class="relaunch-editorial" aria-hidden="true">
          <div class="relaunch-editorial-frame" />

          <div class="relaunch-editorial-top">
            <span>SAAJ / 2026</span>
            <span>Online store renewal</span>
          </div>

          <div class="relaunch-lettering">
            <span>S</span>
            <span>A</span>
            <span>A</span>
            <span>J</span>
          </div>

          <div class="relaunch-transition">
            <div>
              <span class="relaunch-transition-label">Previous store</span>
              <strong>Temporarily offline</strong>
            </div>
            <span class="relaunch-transition-line" />
            <div class="text-right">
              <span class="relaunch-transition-label">Next chapter</span>
              <strong>In progress</strong>
            </div>
          </div>

          <p class="relaunch-editorial-note">
            Adornment, reconsidered.<br>
            The same SAAJ, presented anew.
          </p>
        </aside>
      </div>

      <footer class="relaunch-footer">
        <p>© {{ currentYear }} SAAJ</p>

        <p class="relaunch-thanks">Thank you for being with us.</p>

        <div v-if="socialLinks.length" class="relaunch-socials">
          <a
            v-for="social in socialLinks"
            :key="social.platform"
            :href="social.url"
            target="_blank"
            rel="noopener noreferrer"
            :aria-label="social.platform"
          >
            <SocialIcon :platform="social.platform" />
          </a>
        </div>
      </footer>
    </div>
  </main>
</template>

<style scoped>
.relaunch-page {
  min-height: 100vh;
  background: #f3f0e8;
  color: #171916;
}

.relaunch-shell {
  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.relaunch-header,
.relaunch-footer {
  position: relative;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 26px 34px;
}

.relaunch-header {
  border-bottom: 1px solid rgba(23, 25, 22, 0.12);
}

.relaunch-logo-wrap {
  min-height: 38px;
  display: flex;
  align-items: center;
}

.relaunch-logo {
  width: auto;
  height: 36px;
  max-width: 150px;
  object-fit: contain;
}

.relaunch-wordmark {
  font-family: var(--font-display, Georgia, serif);
  font-size: 30px;
  font-weight: 600;
  letter-spacing: -0.04em;
}

.relaunch-status {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  font-size: 9px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #6c7068;
}

.relaunch-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: #68786d;
  box-shadow: 0 0 0 5px rgba(104, 120, 109, 0.1);
}

.relaunch-grid {
  flex: 1;
  display: grid;
  grid-template-columns: minmax(0, 1.06fr) minmax(460px, 0.94fr);
  min-height: 0;
}

.relaunch-copy {
  display: flex;
  align-items: center;
  padding: 70px 6vw 76px;
}

.relaunch-copy-inner {
  width: 100%;
  max-width: 690px;
}

.relaunch-kicker,
.relaunch-update-label,
.relaunch-transition-label {
  font-size: 9px;
  font-weight: 700;
  line-height: 1.4;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

.relaunch-kicker {
  color: #767a72;
}

.relaunch-copy h1 {
  max-width: 650px;
  margin: 24px 0 0;
  font-family: var(--font-display, Georgia, serif);
  font-size: clamp(54px, 6.25vw, 96px);
  font-weight: 500;
  line-height: 0.91;
  letter-spacing: -0.052em;
}

.relaunch-intro {
  max-width: 570px;
  margin: 30px 0 0;
  font-size: 15px;
  line-height: 1.9;
  color: #5d625a;
}

.relaunch-update {
  max-width: 570px;
  display: grid;
  grid-template-columns: 112px 1fr;
  gap: 24px;
  margin-top: 38px;
  padding-top: 18px;
  border-top: 1px solid rgba(23, 25, 22, 0.12);
}

.relaunch-update-label {
  padding-top: 3px;
  color: #8a8d86;
}

.relaunch-update-title {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: #31352f;
}

.relaunch-update-message {
  margin: 7px 0 0;
  font-size: 12px;
  line-height: 1.7;
  color: #73776f;
}

.relaunch-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 24px 34px;
  margin-top: 38px;
}

.relaunch-check {
  display: inline-flex;
  align-items: center;
  gap: 14px;
  padding: 13px 0 9px;
  border: 0;
  border-bottom: 1px solid #6a6e67;
  background: transparent;
  color: #252824;
  cursor: pointer;
  font: inherit;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  transition: border-color 160ms ease, color 160ms ease, opacity 160ms ease;
}

.relaunch-check svg {
  width: 15px;
  height: 15px;
  transition: transform 160ms ease;
}

.relaunch-check:hover:not(:disabled) {
  border-color: #171916;
  color: #171916;
}

.relaunch-check:hover:not(:disabled) svg {
  transform: translateX(3px);
}

.relaunch-check:disabled {
  cursor: wait;
  opacity: 0.48;
}

.relaunch-contact {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #7d8179;
  text-decoration: none;
  transition: color 160ms ease;
}

.relaunch-contact:hover {
  color: #171916;
}

.relaunch-editorial {
  position: relative;
  overflow: hidden;
  min-height: 650px;
  background: #2d3932;
  color: #f4f1e9;
}

.relaunch-editorial::before {
  content: '';
  position: absolute;
  inset: -30%;
  background:
    radial-gradient(circle at 24% 28%, rgba(255,255,255,0.08), transparent 20%),
    radial-gradient(circle at 72% 72%, rgba(217,225,213,0.08), transparent 24%),
    linear-gradient(118deg, transparent 0 48%, rgba(255,255,255,0.025) 48.2% 48.4%, transparent 48.6%);
  transform: rotate(-4deg);
}

.relaunch-editorial-frame {
  position: absolute;
  inset: 28px;
  border: 1px solid rgba(255, 255, 255, 0.11);
}

.relaunch-editorial-top {
  position: absolute;
  top: 48px;
  left: 50px;
  right: 50px;
  display: flex;
  justify-content: space-between;
  gap: 20px;
  font-size: 8px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.44);
}

.relaunch-lettering {
  position: absolute;
  inset: 50% auto auto 50%;
  transform: translate(-50%, -52%);
  width: 76%;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  align-items: center;
  color: rgba(247, 245, 238, 0.92);
  font-family: var(--font-display, Georgia, serif);
  font-size: clamp(84px, 8.8vw, 148px);
  font-weight: 400;
  line-height: 0.8;
  letter-spacing: -0.09em;
}

.relaunch-lettering span:nth-child(2) {
  transform: translateY(-24%);
  font-style: italic;
}

.relaunch-lettering span:nth-child(3) {
  transform: translateY(22%);
}

.relaunch-lettering span:nth-child(4) {
  transform: translateY(-7%);
  font-style: italic;
}

.relaunch-transition {
  position: absolute;
  left: 50px;
  right: 50px;
  bottom: 104px;
  display: grid;
  grid-template-columns: auto minmax(50px, 1fr) auto;
  align-items: end;
  gap: 18px;
}

.relaunch-transition-label {
  display: block;
  margin-bottom: 7px;
  color: rgba(255, 255, 255, 0.38);
}

.relaunch-transition strong {
  display: block;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.05em;
  color: rgba(255, 255, 255, 0.78);
}

.relaunch-transition-line {
  height: 1px;
  margin-bottom: 5px;
  background: linear-gradient(to right, rgba(255,255,255,.14), rgba(255,255,255,.44), rgba(255,255,255,.14));
}

.relaunch-editorial-note {
  position: absolute;
  left: 50px;
  bottom: 48px;
  margin: 0;
  font-family: var(--font-display, Georgia, serif);
  font-size: 13px;
  font-style: italic;
  line-height: 1.55;
  color: rgba(255,255,255,.38);
}

.relaunch-footer {
  min-height: 72px;
  border-top: 1px solid rgba(23, 25, 22, 0.12);
  font-size: 8px;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #858980;
}

.relaunch-footer p {
  margin: 0;
}

.relaunch-thanks {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
}

.relaunch-socials {
  display: flex;
  align-items: center;
  gap: 15px;
}

.relaunch-socials a {
  display: flex;
  width: 19px;
  height: 19px;
  align-items: center;
  justify-content: center;
  color: #7b8077;
  transition: color 160ms ease;
}

.relaunch-socials a:hover {
  color: #171916;
}

.relaunch-socials :deep(svg) {
  width: 14px;
  height: 14px;
}

@media (max-width: 1023px) {
  .relaunch-grid {
    grid-template-columns: 1fr;
  }

  .relaunch-copy {
    min-height: calc(100vh - 144px);
    padding: 76px 8vw 86px;
  }

  .relaunch-copy-inner {
    max-width: 720px;
  }

  .relaunch-editorial {
    display: none;
  }

  .relaunch-copy::after {
    content: 'SAAJ';
    position: absolute;
    z-index: -1;
    right: -5vw;
    bottom: 95px;
    font-family: var(--font-display, Georgia, serif);
    font-size: 23vw;
    line-height: 0.7;
    letter-spacing: -0.08em;
    color: rgba(45, 57, 50, 0.035);
    pointer-events: none;
  }
}

@media (max-width: 640px) {
  .relaunch-header,
  .relaunch-footer {
    padding-left: 20px;
    padding-right: 20px;
  }

  .relaunch-header {
    padding-top: 20px;
    padding-bottom: 20px;
  }

  .relaunch-logo {
    height: 31px;
    max-width: 128px;
  }

  .relaunch-status {
    max-width: 118px;
    justify-content: flex-end;
    text-align: right;
    font-size: 7px;
    line-height: 1.45;
    letter-spacing: 0.15em;
  }

  .relaunch-copy {
    position: relative;
    min-height: auto;
    padding: 72px 20px 82px;
  }

  .relaunch-copy h1 {
    max-width: 520px;
    margin-top: 20px;
    font-size: clamp(48px, 15.2vw, 68px);
    line-height: 0.93;
  }

  .relaunch-intro {
    margin-top: 26px;
    font-size: 14px;
    line-height: 1.8;
  }

  .relaunch-update {
    grid-template-columns: 1fr;
    gap: 11px;
    margin-top: 32px;
  }

  .relaunch-actions {
    align-items: flex-start;
    flex-direction: column;
    gap: 24px;
    margin-top: 34px;
  }

  .relaunch-footer {
    min-height: 0;
    align-items: flex-start;
    padding-top: 20px;
    padding-bottom: 22px;
  }

  .relaunch-thanks {
    display: none;
  }
}
</style>
