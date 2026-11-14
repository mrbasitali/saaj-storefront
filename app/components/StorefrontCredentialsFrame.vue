<script setup lang="ts">
defineProps<{
  title: string
  description: string
}>()

const accountBenefits = [
  {
    label: 'Orders in one place',
    detail: 'See your order history and track deliveries.',
    icon: 'package',
  },
  {
    label: 'Save your favourites',
    detail: 'Keep the pieces you like on your wishlist.',
    icon: 'heart',
  },
  {
    label: 'Faster checkout',
    detail: 'Save your delivery addresses for next time.',
    icon: 'pin',
  },
] as const
</script>

<template>
  <section class="credentials-page storefront-field-theme">
    <div class="credentials-layout">
      <div class="credentials-panel">
        <header class="credentials-heading">
          <h1>{{ title }}</h1>
          <p>{{ description }}</p>
        </header>
        <slot />
      </div>

      <aside class="credentials-guide" aria-labelledby="credentials-guide-title">
        <h2 id="credentials-guide-title">Account benefits</h2>
        <ul class="credentials-benefits">
          <li v-for="benefit in accountBenefits" :key="benefit.label">
            <StorefrontIcon :name="benefit.icon" :size="22" class="credentials-guide-icon" />
            <div>
              <span class="credentials-guide-label">{{ benefit.label }}</span>
              <span class="credentials-guide-detail">{{ benefit.detail }}</span>
            </div>
          </li>
        </ul>
      </aside>
    </div>
  </section>
</template>

<style scoped>
.credentials-page {
  --canvas: #fff;
  --ink: var(--field-ink);
  --muted: var(--field-muted);
  --line: var(--field-line);
  --rule: #e4e4e4;
  --subtle: var(--field-surface);
  --active: var(--field-active);
  --action: #201f1c;
  --action-hover: #413e38;
  --on-action: #fff;
  --error-ink: #8e2929;
  --error-bg: #f9ebe8;
  --info-ink: #294f3e;
  --curve: var(--field-curve);

  background: var(--canvas);
  color: var(--ink);
}

html.dark .credentials-page {
  --canvas: #171614;
  --rule: #4a4640;
  --action: #efeee9;
  --action-hover: #fff;
  --on-action: #1b1b19;
  --error-ink: #ffb5ac;
  --error-bg: #361f1f;
  --info-ink: #b8e3cb;
}

.credentials-layout {
  display: grid;
  gap: 2.75rem;
  width: min(100%, 31rem);
  margin-inline: auto;
  padding: clamp(2.75rem, 7vw, 6rem) 1.25rem 3.75rem;
}

.credentials-guide,
.credentials-panel {
  min-width: 0;
}

.credentials-heading { margin-bottom: 1.625rem; }
.credentials-heading h1 {
  font-family: var(--font-display);
  font-size: clamp(2.875rem, 5vw, 4.25rem);
  font-weight: 500;
  letter-spacing: -.035em;
  line-height: 1.05;
}
.credentials-heading p {
  margin-top: .75rem;
  color: var(--muted);
  font-size: 1rem;
  line-height: 1.5;
}

.credentials-guide h2 {
  font-size: 1.25rem;
  font-weight: 600;
  line-height: 1.3;
}
.credentials-benefits {
  margin-top: 1.25rem;
}
.credentials-benefits li {
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr);
  align-items: center;
  gap: .875rem;
  padding-block: 1rem;
}
.credentials-benefits li + li {
  border-top: 1px solid var(--rule);
}
.credentials-guide-label,
.credentials-guide-detail {
  display: block;
}
.credentials-guide-label {
  font-size: 1rem;
  font-weight: 600;
}
.credentials-guide-detail {
  margin-top: .125rem;
  color: var(--muted);
  font-size: .875rem;
  line-height: 1.4;
}
.credentials-guide-icon { color: var(--ink); }

@media (min-width: 880px) {
  .credentials-layout {
    grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
    align-items: start;
    column-gap: clamp(3rem, 7vw, 7rem);
    width: min(100%, 76rem);
    min-height: clamp(39rem, 75svh, 48rem);
    padding-inline: clamp(2.5rem, 6vw, 5.5rem);
    padding-bottom: clamp(5rem, 9vh, 7rem);
  }
  .credentials-guide {
    border-inline-start: 1px solid var(--rule);
    padding: .75rem 0 0 clamp(3rem, 6vw, 6rem);
  }
  .credentials-benefits { margin-top: 1.625rem; }
}

@media (min-width: 880px) and (min-height: 480px) {
  .credentials-guide {
    position: sticky;
    top: 5.75rem;
  }
}

@media (min-width: 1024px) and (min-height: 480px) {
  .credentials-guide {
    /* Clear the header and its desktop navigation row. */
    top: 8.5rem;
  }
}

.credentials-panel :deep(.credentials-methods) {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  position: relative;
  margin-bottom: 1.75rem;
  box-shadow: inset 0 -1px var(--rule);
}

.credentials-panel :deep(.credentials-method) {
  min-height: 46px;
  padding: .375rem .25rem;
  color: var(--muted);
  font-size: .9375rem;
  line-height: 1.25;
  cursor: pointer;
  transition: color 200ms ease;
}
.credentials-panel :deep(.credentials-method:hover) { color: var(--ink); }
.credentials-panel :deep(.credentials-method[aria-pressed="true"]) {
  color: var(--active);
  font-weight: 600;
}

.credentials-panel :deep(.credentials-method-indicator) {
  position: absolute;
  inset: auto auto 0 0;
  width: 50%;
  border-bottom: 1px solid var(--active);
  pointer-events: none;
  transition: transform 340ms var(--curve);
}
.credentials-panel :deep(.credentials-methods[data-mode="phone"] .credentials-method-indicator) {
  transform: translateX(100%);
}
.credentials-panel :deep(.credentials-switch-enter-active) {
  transition: opacity 240ms var(--curve), transform 280ms var(--curve);
}
.credentials-panel :deep(.credentials-switch-leave-active) {
  transition: opacity 115ms ease, transform 115ms ease;
}
.credentials-panel :deep(.credentials-switch-enter-from) {
  opacity: 0;
  transform: translateY(7px);
}
.credentials-panel :deep(.credentials-switch-leave-to) {
  opacity: 0;
  transform: translateY(-4px);
}

.credentials-panel :deep(.credentials-form) { display: grid; gap: 1.125rem; }
.credentials-panel :deep(.credentials-otp input:focus) { outline: none; }

.credentials-panel :deep(.credentials-help) {
  color: var(--muted);
  font-size: .8125rem;
  line-height: 1.5;
}
.credentials-panel :deep(.credentials-link) {
  color: var(--ink);
  font-size: .875rem;
  font-weight: 600;
  line-height: 1.4;
  text-decoration: underline;
  text-underline-offset: .2em;
}
.credentials-panel :deep(button.credentials-link:not(:disabled)) { cursor: pointer; }
.credentials-panel :deep(.credentials-link:disabled) { color: var(--muted); text-decoration: none; }
.credentials-panel :deep(.credentials-link:hover:not(:disabled)) { text-decoration-thickness: 2px; }

.credentials-panel :deep(.credentials-submit) {
  display: flex;
  width: 100%;
  min-height: 50px;
  align-items: center;
  justify-content: center;
  gap: .625rem;
  padding: .6875rem 1rem;
  background: var(--action);
  color: var(--on-action);
  font-size: .9375rem;
  font-weight: 600;
  transition: background-color 200ms ease, opacity 200ms ease, transform 220ms var(--curve);
}
.credentials-panel :deep(.credentials-submit:hover:not(:disabled)) { background: var(--action-hover); cursor: pointer; }
.credentials-panel :deep(.credentials-submit:active:not(:disabled)) { transform: translateY(1px); }
.credentials-panel :deep(.credentials-submit:disabled) { opacity: .55; }
.credentials-panel :deep(:is(button, a):focus-visible) { outline: 2px solid var(--ink); outline-offset: 2px; }
.credentials-panel :deep(.credentials-otp > div) {
  aspect-ratio: auto;
  min-height: 3rem;
  border: 0;
  background: var(--subtle);
  color: var(--ink);
}

.credentials-panel :deep(.credentials-message) {
  padding: .75rem .875rem;
  background: var(--subtle);
  font-size: .875rem;
  line-height: 1.5;
}
.credentials-panel :deep(.credentials-message-error) {
  background: var(--error-bg);
  color: var(--error-ink);
}
.credentials-panel :deep(.credentials-success) { color: var(--info-ink); }
.credentials-panel :deep(.credentials-error) { color: var(--error-ink); }

.credentials-panel :deep(.credentials-footer) {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: .5rem 1rem;
  margin-top: 1.5rem;
  padding-top: 1.25rem;
  border-top: 1px solid var(--rule);
  color: var(--muted);
  font-size: .875rem;
  line-height: 1.4;
}

@media (prefers-reduced-motion: reduce) {
  .credentials-panel :deep(.credentials-method),
  .credentials-panel :deep(.credentials-method-indicator),
  .credentials-panel :deep(.credentials-submit),
  .credentials-panel :deep(.credentials-switch-enter-active),
  .credentials-panel :deep(.credentials-switch-leave-active) { transition: none; }
}
</style>
