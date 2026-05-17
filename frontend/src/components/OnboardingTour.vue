<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'

const emit = defineEmits<{ done: [] }>()
const router = useRouter()

interface TourStep {
  selector: string
  route?: string
  scroll?: 'element' | 'top'
  noSpotlight?: boolean
  padRight?: number
  padTop?: number
  prePosition?: boolean
  title: string
  desc: string
  tip: 'right' | 'left' | 'above' | 'below'
}

const steps: TourStep[] = [
  {
    selector: '[data-tour="sidebar"]',
    title: 'Navigation Sidebar',
    desc: 'All the main sections of the app live here - Dashboard, Profile, AI Health, and Reports. Collapse it anytime with the arrow in the top bar.',
    tip: 'right',
  },
  {
    selector: '[data-tour="user-footer"]',
    padRight: 0,
    title: 'Your Profile',
    desc: 'Your profile card lives here in the bottom-left corner. Tap it to update your height, weight, sleep, and lifestyle info - these power your Health KPIs and personalised recommendations.',
    tip: 'right',
  },
  {
    selector: '[data-tour="ble-btn"]',
    route: '/dashboard',
    scroll: 'top',
    title: 'Connect Your Device',
    desc: 'Tap this button to pair your RoseGuard sensor via Bluetooth. Once connected, live SpO₂, heart rate, and temperature stream straight to your dashboard in real time.',
    tip: 'below',
  },
  {
    selector: '[data-tour="trends-section"]',
    route: '/dashboard',
    scroll: 'element',
    title: 'Metric Trend Charts',
    desc: 'These three charts capture your SpO₂, heart rate, and temperature over time. Hit "Measure All" to start a session. To unlock AI analysis, you need readings from all three metrics.',
    tip: 'above',
  },
  {
    selector: '[data-tour="nav-history"]',
    scroll: 'top',
    padRight: 0,
    prePosition: true,
    title: 'AI Health History',
    desc: 'Once you have trend data, head here for interactive charts, pattern detection, and a full AI-powered breakdown of your biometric history.',
    tip: 'right',
  },
  {
    selector: '[data-tour="nav-journal"]',
    padRight: 0,
    prePosition: true,
    title: 'Wellness Journal',
    desc: 'Check in daily with a short wellness questionnaire. Your answers are sent to AI for a personalised analysis covering mood, energy, sleep, stress, symptoms, and more.',
    tip: 'right',
  },
  {
    selector: '[data-tour="pdf-btn"]',
    scroll: 'top',
    title: 'Download PDF Report',
    desc: 'Generate a snapshot PDF of your current health data - live readings, Health KPIs, and trend charts - all in one shareable document.',
    tip: 'below',
  },
  {
    selector: '[data-tour="fab"]',
    title: 'AI Health Assistant',
    desc: 'Your personal health assistant is always one tap away. Ask anything about your readings or wellness. New conversations unlock automatically as your metric data builds up.',
    tip: 'above',
  },
  {
    selector: '[data-tour="nav-reports"]',
    padRight: 0,
    title: 'Saved Reports',
    desc: 'Every PDF you generate is saved here. Browse and download your full report history any time from this section.',
    tip: 'right',
  },
]

const step             = ref(0)
const rect             = ref<DOMRect | null>(null)
const visible          = ref(false)
const suppressSpotlight = ref(false)
const cardEl           = ref<HTMLElement | null>(null)
const winW         = ref(window.innerWidth)
const winH         = ref(window.innerHeight)

const PAD    = 16
const RADIUS = 12
const CARD_W = 300
const MARGIN = 12

const clampLeft = (x: number) =>
  Math.min(winW.value - CARD_W - MARGIN, Math.max(MARGIN, x))

const clampTop = (y: number, cardH: number) =>
  Math.min(winH.value - cardH - MARGIN, Math.max(MARGIN, y))

const spotlight = computed(() => {
  if (!rect.value || steps[step.value].noSpotlight) return null
  const def = steps[step.value]
  const pR  = def.padRight ?? PAD
  const pT  = def.padTop   ?? PAD
  const x1  = Math.max(0, rect.value.left   - PAD)
  const y1  = Math.max(0, rect.value.top    - pT)
  const x2  = Math.min(winW.value, rect.value.right  + pR)
  const y2  = Math.min(winH.value, rect.value.bottom + PAD)
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1, r: RADIUS }
})

// Single element approach: transparent box with border-radius + huge box-shadow
// creates a naturally rounded spotlight without any corner artefacts
const spotlightBoxStyle = computed(() => {
  if (suppressSpotlight.value) return null
  const s = spotlight.value
  if (!s) return null
  return {
    top:          `${s.y}px`,
    left:         `${s.x}px`,
    width:        `${s.w}px`,
    height:       `${s.h}px`,
    borderRadius: `${s.r}px`,
  }
})


const wrapperStyle = computed(() => {
  const cardH = cardEl.value?.offsetHeight ?? 220
  const def   = steps[step.value]
  const r     = rect.value

  if (!r) {
    return {
      left: `${clampLeft(winW.value / 2 - CARD_W / 2)}px`,
      top:  `${clampTop(winH.value / 2 - cardH / 2, cardH)}px`,
    }
  }

  const sxL = def.noSpotlight ? r.left   : (spotlight.value?.x ?? r.left)
  const sxT = def.noSpotlight ? r.top    : (spotlight.value?.y ?? r.top)
  const sxW = def.noSpotlight ? r.width  : (spotlight.value?.w ?? r.width)
  const sxH = def.noSpotlight ? r.height : (spotlight.value?.h ?? r.height)
  const GAP = 18

  switch (def.tip) {
    case 'right':
      return {
        left: `${clampLeft(sxL + sxW + GAP)}px`,
        top:  `${clampTop(sxT + sxH / 2 - cardH / 2, cardH)}px`,
      }
    case 'left':
      return {
        left: `${clampLeft(sxL - CARD_W - GAP)}px`,
        top:  `${clampTop(sxT + sxH / 2 - cardH / 2, cardH)}px`,
      }
    case 'below':
      return {
        left: `${clampLeft(sxL + sxW / 2 - CARD_W / 2)}px`,
        top:  `${clampTop(sxT + sxH + GAP, cardH)}px`,
      }
    case 'above':
      return {
        left: `${clampLeft(sxL + sxW / 2 - CARD_W / 2)}px`,
        top:  `${clampTop(sxT - GAP - cardH, cardH)}px`,
      }
    default: return {}
  }
})

function lockScroll() {
  document.documentElement.style.overflow = 'hidden'
}

function unlockScroll() {
  document.documentElement.style.overflow = ''
}

async function focusStep(idx: number) {
  document.documentElement.dataset.tourStep = String(idx)
  const def = steps[idx]
  // Only unlock when leaving the early locked steps or when this step needs to scroll
  if (idx >= 3 || def.scroll) unlockScroll()
  suppressSpotlight.value = true
  // step.value stays at the old value so the card keeps its current position/tip
  // during the transition; both update together at the end with the new rect.

  if (def.route) {
    try { await router.push(def.route) } catch {}
    await nextTick()
    await new Promise(r => setTimeout(r, 150))
  }

  // Fixed-position targets (e.g. sidebar items): measure early so the card starts
  // animating to its destination while the page scrolls, not after.
  if (def.prePosition) {
    await nextTick()
    const preEl = document.querySelector(def.selector)
    rect.value  = preEl ? preEl.getBoundingClientRect() : null
    step.value  = idx
  }

  if (def.scroll === 'top') {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    await new Promise(r => setTimeout(r, 400))
  }

  await nextTick()
  const el = document.querySelector(def.selector)

  if (el && def.scroll === 'element') {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    await new Promise(r => setTimeout(r, 500))
    lockScroll()
  }

  // For early steps, lock scroll before measuring so the viewport is stable
  // (removing the scrollbar on Windows widens the viewport and shifts element rects)
  if (idx < 3) {
    lockScroll()
    await nextTick()
  }

  if (!def.prePosition) {
    rect.value = el ? el.getBoundingClientRect() : null
    step.value = idx
  }
  suppressSpotlight.value = false
}

function next() {
  if (step.value < steps.length - 1) focusStep(step.value + 1)
  else { unlockScroll(); emit('done') }
}

function prev() {
  if (step.value > 0) focusStep(step.value - 1)
}

function onResize() {
  winW.value = window.innerWidth
  winH.value = window.innerHeight
  const el = document.querySelector(steps[step.value].selector)
  if (el) rect.value = el.getBoundingClientRect()
}

onMounted(async () => {
  window.addEventListener('resize', onResize)
  window.scrollTo({ top: 0 })
  await focusStep(0)
  visible.value = true
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  unlockScroll()
  delete document.documentElement.dataset.tourStep
})

const isLast = computed(() => step.value === steps.length - 1)
</script>

<template>
  <Teleport to="body">
    <Transition name="tour-fade">
      <div v-if="visible" class="tour-root" aria-modal="true" role="dialog">

        <!-- Invisible full-screen click blocker — sits below the panels but above the page -->
        <div class="click-blocker" />

        <!-- Single spotlight element with box-shadow for rounded overlay -->
        <div v-if="spotlightBoxStyle" class="spotlight-box" :style="spotlightBoxStyle" />
        <div v-else class="veil-panel veil-full" />

        <!-- Card anchor positions the card; inner card animates between steps -->
        <div class="tour-card-anchor" :style="wrapperStyle">
          <Transition name="card-shift" mode="out-in">
            <div ref="cardEl" class="tour-card" :key="step">
              <div class="card-step">Step {{ step + 1 }} / {{ steps.length }}</div>
              <h3>{{ steps[step].title }}</h3>
              <p>{{ steps[step].desc }}</p>

              <div class="dots">
                <span
                  v-for="(_, i) in steps"
                  :key="i"
                  class="dot"
                  :class="{ active: i === step, past: i < step }"
                />
              </div>

              <div class="card-nav">
                <button
                  class="btn-back"
                  :style="{ visibility: step === 0 ? 'hidden' : 'visible' }"
                  @click="prev"
                >
                  <i class="pi pi-angle-left" /> Back
                </button>
                <button class="btn-skip" @click="unlockScroll(); emit('done')">Skip</button>
                <button class="btn-next" @click="next">
                  {{ isLast ? 'Finish' : 'Next' }}
                  <i :class="`pi ${isLast ? 'pi-check' : 'pi-angle-right'}`" />
                </button>
              </div>
            </div>
          </Transition>
        </div>

      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.tour-root {
  position: fixed;
  inset: 0;
  z-index: 2000;
  pointer-events: none;
}

/* Blocks all clicks on the page without any visual */
.click-blocker {
  position: fixed;
  inset: 0;
  z-index: 2000;
  pointer-events: all;
}

/* Full-screen veil for noSpotlight steps */
.veil-panel {
  position: fixed;
  background: rgba(0, 0, 0, 0.62);
  z-index: 2001;
  pointer-events: none;
}

.veil-full { inset: 0; }

/* Rounded spotlight via box-shadow — single element, no corner artefacts */
.spotlight-box {
  position: fixed;
  background: transparent;
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.62);
  z-index: 2001;
  pointer-events: none;
  transition: top           0.4s cubic-bezier(0.4, 0, 0.2, 1),
              left          0.4s cubic-bezier(0.4, 0, 0.2, 1),
              width         0.4s cubic-bezier(0.4, 0, 0.2, 1),
              height        0.4s cubic-bezier(0.4, 0, 0.2, 1),
              border-radius 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}


/* Card anchor handles positioning + slides between steps */
.tour-card-anchor {
  position: fixed;
  pointer-events: all;
  z-index: 2003;
  width: 300px;
  transition: left 0.4s cubic-bezier(0.4, 0, 0.2, 1),
              top  0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.tour-card {
  background: var(--color-bg, #fff);
  border: 1px solid var(--color-border, #e8eaf6);
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.22);
  padding: 22px 24px 20px;
  width: 300px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.card-step {
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: var(--color-primary, #e91e8c);
}

h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  color: var(--color-text-primary, #1a1a2e);
  line-height: 1.25;
}

p {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--color-text-secondary, #78909c);
}

.dots {
  display: flex;
  gap: 5px;
  align-items: center;
  flex-wrap: wrap;
}

.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--color-border, #e8eaf6);
  flex-shrink: 0;
  transition: background 0.25s ease, width 0.25s ease, border-radius 0.25s ease;
}

.dot.past   { background: rgba(233, 30, 140, 0.3); }
.dot.active { background: var(--color-primary, #e91e8c); width: 18px; border-radius: 4px; }

.card-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 2px;
}

.btn-back {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: transparent;
  border: 1.5px solid var(--color-border, #e8eaf6);
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary, #78909c);
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s, border-color 0.15s;
}

.btn-back:hover { background: var(--color-surface, #f8f9fc); border-color: #ccc; }

.btn-skip {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-secondary, #78909c);
  background: transparent;
  border: none;
  cursor: pointer;
  font-family: inherit;
  padding: 4px 6px;
  transition: color 0.15s;
}

.btn-skip:hover { color: var(--color-text-primary, #1a1a2e); }

.btn-next {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 16px;
  background: var(--color-primary, #e91e8c);
  border: none;
  border-radius: 8px;
  font-size: 12.5px;
  font-weight: 700;
  color: #fff;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s, transform 0.1s;
}

.btn-next:hover { background: #c9186f; transform: translateY(-1px); }

.tour-fade-enter-active, .tour-fade-leave-active { transition: opacity 0.3s ease; }
.tour-fade-enter-from,  .tour-fade-leave-to      { opacity: 0; }

.card-shift-enter-active, .card-shift-leave-active { transition: opacity 0.18s ease, transform 0.18s ease; }
.card-shift-enter-from { opacity: 0; transform: translateY(8px)  scale(0.97); }
.card-shift-leave-to   { opacity: 0; transform: translateY(-6px) scale(0.97); }
</style>

<!-- Non-scoped: suppresses active nav styling on sibling items during Journal step -->
<style>
[data-tour-step="5"] .nav-item.active:not([data-tour="nav-journal"]) {
  background: transparent !important;
  border-left-color: transparent !important;
  color: var(--color-sidebar-text, rgba(255, 255, 255, 0.65)) !important;
  font-weight: 500 !important;
}
</style>
