<script setup lang="ts">
const props = withDefaults(defineProps<{
  active?: boolean
  burstKey?: number
  size?: number
}>(), {
  active: false,
  burstKey: 0,
  size: 20,
})

const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
const gradientId = `saaj-heart-gradient-${uid}`
</script>

<template>
  <span
    class="saaj-heart"
    :class="{ 'is-active': active }"
    :style="{ '--saaj-heart-size': `${size}px` }"
    aria-hidden="true"
  >
    <svg
      class="saaj-heart-main"
      viewBox="0 0 24 24"
      :width="size"
      :height="size"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient :id="gradientId" x1="4" y1="3" x2="20" y2="21" gradientUnits="userSpaceOnUse">
          <stop stop-color="#ff7a8b" />
          <stop offset="0.48" stop-color="#e8385f" />
          <stop offset="1" stop-color="#a41442" />
        </linearGradient>
      </defs>
      <path
        d="M12 21.1 3.36 13.16C1.32 11.3 1.2 8.12 3.08 6.08a5.2 5.2 0 0 1 7.58-.08L12 7.38 13.34 6a5.2 5.2 0 0 1 7.58.08c1.88 2.04 1.76 5.22-.28 7.08L12 21.1Z"
        :fill="active ? `url(#${gradientId})` : 'none'"
        :stroke="active ? 'url(#' + gradientId + ')' : 'currentColor'"
        stroke-width="1.45"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>

    <span v-if="burstKey > 0" :key="burstKey" class="saaj-heart-burst">
      <span class="saaj-heart-ring" />
      <svg class="saaj-heart-fly saaj-heart-fly-1" viewBox="0 0 24 24"><path d="M12 21.1 3.36 13.16C1.32 11.3 1.2 8.12 3.08 6.08a5.2 5.2 0 0 1 7.58-.08L12 7.38 13.34 6a5.2 5.2 0 0 1 7.58.08c1.88 2.04 1.76 5.22-.28 7.08L12 21.1Z" /></svg>
      <svg class="saaj-heart-fly saaj-heart-fly-2" viewBox="0 0 24 24"><path d="M12 21.1 3.36 13.16C1.32 11.3 1.2 8.12 3.08 6.08a5.2 5.2 0 0 1 7.58-.08L12 7.38 13.34 6a5.2 5.2 0 0 1 7.58.08c1.88 2.04 1.76 5.22-.28 7.08L12 21.1Z" /></svg>
      <span class="saaj-heart-spark saaj-heart-spark-1" />
      <span class="saaj-heart-spark saaj-heart-spark-2" />
      <span class="saaj-heart-spark saaj-heart-spark-3" />
      <span class="saaj-heart-spark saaj-heart-spark-4" />
    </span>
  </span>
</template>

<style scoped>
.saaj-heart {
  position: relative;
  display: inline-grid;
  width: var(--saaj-heart-size);
  height: var(--saaj-heart-size);
  place-items: center;
  flex: 0 0 auto;
}

.saaj-heart-main {
  display: block;
  overflow: visible;
  transform-origin: 50% 56%;
  transition: transform 360ms cubic-bezier(.18, .9, .24, 1.25), filter 280ms ease;
}

.saaj-heart.is-active .saaj-heart-main {
  transform: scale(1.055);
  filter: drop-shadow(0 3px 8px rgb(216 42 82 / .16));
}

.saaj-heart-burst {
  position: absolute;
  inset: 50% auto auto 50%;
  width: 1px;
  height: 1px;
  pointer-events: none;
}

.saaj-heart-ring {
  position: absolute;
  left: 50%;
  top: 50%;
  width: calc(var(--saaj-heart-size) * .9);
  height: calc(var(--saaj-heart-size) * .9);
  border: 1.5px solid rgb(232 56 95 / .55);
  border-radius: 999px;
  transform: translate(-50%, -50%) scale(.45);
  animation: saajHeartRing 620ms cubic-bezier(.16, 1, .3, 1) both;
}

.saaj-heart-fly {
  position: absolute;
  left: 0;
  top: 0;
  width: calc(var(--saaj-heart-size) * .42);
  height: calc(var(--saaj-heart-size) * .42);
  fill: #e8385f;
  opacity: 0;
  transform-origin: center;
  filter: drop-shadow(0 2px 4px rgb(164 20 66 / .12));
}

.saaj-heart-fly-1 { animation: saajHeartFlyOne 760ms cubic-bezier(.18, .8, .2, 1) both; }
.saaj-heart-fly-2 { animation: saajHeartFlyTwo 820ms 45ms cubic-bezier(.18, .8, .2, 1) both; }

.saaj-heart-spark {
  position: absolute;
  left: 0;
  top: 0;
  width: 4px;
  height: 4px;
  border-radius: 999px;
  background: #ff7187;
  opacity: 0;
}
.saaj-heart-spark-1 { animation: saajHeartSpark1 620ms 30ms ease-out both; }
.saaj-heart-spark-2 { animation: saajHeartSpark2 650ms 20ms ease-out both; }
.saaj-heart-spark-3 { animation: saajHeartSpark3 610ms 55ms ease-out both; }
.saaj-heart-spark-4 { animation: saajHeartSpark4 680ms 10ms ease-out both; }

@keyframes saajHeartRing {
  0% { opacity: .85; transform: translate(-50%, -50%) scale(.38); }
  100% { opacity: 0; transform: translate(-50%, -50%) scale(1.9); }
}
@keyframes saajHeartFlyOne {
  0% { opacity: 0; transform: translate(-50%, -50%) scale(.3) rotate(-8deg); }
  18% { opacity: .95; }
  100% { opacity: 0; transform: translate(-30px, -44px) scale(.72) rotate(-20deg); }
}
@keyframes saajHeartFlyTwo {
  0% { opacity: 0; transform: translate(-50%, -50%) scale(.25) rotate(9deg); }
  18% { opacity: .82; }
  100% { opacity: 0; transform: translate(21px, -36px) scale(.58) rotate(20deg); }
}
@keyframes saajHeartSpark1 { 0% { opacity: 0; transform: translate(-2px,-2px) scale(.4); } 25% { opacity: 1; } 100% { opacity: 0; transform: translate(-24px,-21px) scale(.85); } }
@keyframes saajHeartSpark2 { 0% { opacity: 0; transform: translate(-2px,-2px) scale(.4); } 25% { opacity: 1; } 100% { opacity: 0; transform: translate(27px,-18px) scale(.7); } }
@keyframes saajHeartSpark3 { 0% { opacity: 0; transform: translate(-2px,-2px) scale(.4); } 25% { opacity: 1; } 100% { opacity: 0; transform: translate(-17px,19px) scale(.6); } }
@keyframes saajHeartSpark4 { 0% { opacity: 0; transform: translate(-2px,-2px) scale(.4); } 25% { opacity: .95; } 100% { opacity: 0; transform: translate(22px,14px) scale(.78); } }

@media (prefers-reduced-motion: reduce) {
  .saaj-heart-main { transition-duration: .01ms; }
  .saaj-heart-burst { display: none; }
}
</style>
