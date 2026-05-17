<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

const mode      = ref<'login' | 'register'>('login')
const email     = ref('')
const password  = ref('')
const firstName = ref('')
const lastName  = ref('')
const loading   = ref(false)
const error     = ref('')
const shakeError = ref(false)
const animating  = ref(false)
const fadingOut  = ref(false)

async function loginSuccess() {
  animating.value = true

  await new Promise<void>(resolve => {
    const audio = new Audio('/systemReboot.mp3')
    let ctx: AudioContext | null = null

    function setupFade() {
      if (ctx || isNaN(audio.duration)) return
      ctx = new AudioContext()
      const source = ctx.createMediaElementSource(audio)
      const gain   = ctx.createGain()
      source.connect(gain)
      gain.connect(ctx.destination)

      // Fade starts 45% into the track and uses a time constant sized so
      // gain reaches ~1% (e^-4) by the natural end — completely silent.
      const fadeAt = audio.duration * 0.45
      const tau    = (audio.duration - fadeAt) / 4

      gain.gain.setValueAtTime(1, ctx.currentTime)
      gain.gain.setValueAtTime(1, ctx.currentTime + fadeAt)
      gain.gain.setTargetAtTime(0.001, ctx.currentTime + fadeAt, tau)
    }

    audio.addEventListener('loadedmetadata', setupFade)
    audio.addEventListener('ended', () => { ctx?.close(); resolve() })
    audio.play().catch(() => resolve())
    if (audio.readyState >= 1) setupFade()
  })

  fadingOut.value = true
  document.body.style.background = '#120810'
  await new Promise(r => setTimeout(r, 220))
  router.push('/dashboard')
}

onMounted(() => {
  if (!window.google) return
  window.google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: async (response: { credential: string }) => {
      try {
        await auth.loginWithGoogle(response.credential)
        await loginSuccess()
      } catch (e: any) {
        error.value = e.message
        triggerShake()
      }
    },
  })
  window.google.accounts.id.renderButton(
    document.getElementById('google-btn')!,
    { type: 'standard', theme: 'outline', size: 'large', width: 360, text: 'continue_with' }
  )
})

function switchMode(m: 'login' | 'register') {
  mode.value = m
  error.value = ''
  email.value = ''
  password.value = ''
  firstName.value = ''
  lastName.value = ''
}

async function handleSubmit() {
  error.value = ''

  if (mode.value === 'login') {
    if (!email.value || !password.value) {
      error.value = 'Please enter your email and password.'
      triggerShake(); return
    }
  } else {
    if (!firstName.value || !lastName.value || !email.value || !password.value) {
      error.value = 'Please fill in all fields.'
      triggerShake(); return
    }
  }

  loading.value = true
  try {
    if (mode.value === 'login') {
      await auth.login(email.value, password.value)
    } else {
      await auth.register(email.value, password.value, firstName.value, lastName.value)
    }
    await loginSuccess()
  } catch (e: any) {
    error.value = e.message
    triggerShake()
    loading.value = false
  }
}

function triggerShake() {
  shakeError.value = false
  requestAnimationFrame(() => {
    shakeError.value = true
    setTimeout(() => { shakeError.value = false }, 500)
  })
}
</script>

<template>
  <div class="signin-page" :class="{ animating, 'fading-out': fadingOut }">

    <!-- Left panel -->
    <div class="signin-left">
      <div class="orb orb-1" />
      <div class="orb orb-2" />
      <div class="orb orb-3" />

      <div class="left-content">
        <!-- Logo — stays visible during animation, flies to center -->
        <div class="brand animate-fade-down">
          <img src="@/assets/logo.png" alt="RoseGuard Monitor" class="brand-logo-img" />
          <p class="brand-slogan">Your health, always in view.</p>
        </div>

        <!-- Text + features — collapse on successful login -->
        <div class="collapsible-content">
          <div class="left-hero animate-fade-up" style="animation-delay: 0.1s">
            <h2>Monitor your health,<br />live better every day.</h2>
            <p>
              Real-time biometric data from your wearable sensor -
              SpO2, heart rate, and temperature, all in one place.
            </p>
          </div>

          <div class="left-features">
            <div class="feature-item animate-fade-up" style="animation-delay: 0.2s">
              <span class="feature-icon"><i class="pi pi-heart" /></span>
              <span>Live biometric readings via Bluetooth</span>
            </div>
            <div class="feature-item animate-fade-up" style="animation-delay: 0.28s">
              <span class="feature-icon"><i class="pi pi-chart-line" /></span>
              <span>Health KPIs &amp; trend analysis</span>
            </div>
            <div class="feature-item animate-fade-up" style="animation-delay: 0.36s">
              <span class="feature-icon"><i class="pi pi-file-pdf" /></span>
              <span>Professional PDF health reports</span>
            </div>
            <div class="feature-item animate-fade-up" style="animation-delay: 0.44s">
              <span class="feature-icon"><i class="pi pi-sparkles" /></span>
              <span>AI health analysis &amp; advice</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Right panel — collapses on successful login -->
    <div class="signin-right">
      <div class="form-card animate-fade-up">
        <div class="form-header">
          <h1>{{ mode === 'login' ? 'Welcome back' : 'Create account' }}</h1>
          <p>{{ mode === 'login' ? 'Sign in to your RoseGuard account' : 'Start monitoring your health today' }}</p>
        </div>

        <div id="google-btn" class="google-btn-wrap" />

        <div class="divider"><span>or continue with email</span></div>

        <Transition name="error">
          <div v-if="error" class="error-msg" :class="{ shake: shakeError }">
            <i class="pi pi-exclamation-circle" /> {{ error }}
          </div>
        </Transition>

        <form class="signin-form" @submit.prevent="handleSubmit">
          <Transition name="fields" mode="out-in">
            <div v-if="mode === 'register'" class="name-row" key="name">
              <div class="field">
                <label for="firstName">First name</label>
                <div class="input-wrap">
                  <i class="pi pi-user input-icon" />
                  <input id="firstName" v-model="firstName" type="text" placeholder="Ana" autocomplete="given-name" />
                </div>
              </div>
              <div class="field">
                <label for="lastName">Last name</label>
                <div class="input-wrap">
                  <i class="pi pi-user input-icon" />
                  <input id="lastName" v-model="lastName" type="text" placeholder="Ionescu" autocomplete="family-name" />
                </div>
              </div>
            </div>
          </Transition>

          <div class="field">
            <label for="email">Email address</label>
            <div class="input-wrap">
              <i class="pi pi-envelope input-icon" />
              <input id="email" v-model="email" type="email" placeholder="you@example.com" autocomplete="email" />
            </div>
          </div>

          <div class="field">
            <div class="label-row">
              <label for="password">Password</label>
              <a v-if="mode === 'login'" href="#" class="forgot-link">Forgot password?</a>
            </div>
            <div class="input-wrap">
              <i class="pi pi-lock input-icon" />
              <input id="password" v-model="password" type="password" placeholder="••••••••" autocomplete="current-password" />
            </div>
          </div>

          <button type="submit" class="signin-btn" :disabled="loading">
            <i v-if="loading" class="pi pi-spin pi-spinner" />
            <span>{{ loading ? '…' : mode === 'login' ? 'Sign in' : 'Create account' }}</span>
          </button>
        </form>

        <p class="signup-link">
          <template v-if="mode === 'login'">
            Don't have an account?
            <a href="#" @click.prevent="switchMode('register')">Create one</a>
          </template>
          <template v-else>
            Already have an account?
            <a href="#" @click.prevent="switchMode('login')">Sign in</a>
          </template>
        </p>
      </div>
    </div>

  </div>
</template>

<style scoped>
/* ============================================================
   Page layout
   ============================================================ */
.signin-page {
  display: flex;
  min-height: 100vh;
  width: 100%;
}

.signin-page::before {
  content: '';
  position: fixed;
  inset: 0;
  background: #120810;
  opacity: 0;
  pointer-events: none;
  z-index: 9999;
  transition: opacity 0.2s ease;
}

.signin-page.fading-out::before {
  opacity: 1;
}

/* ============================================================
   Left panel
   ============================================================ */
.signin-left {
  flex: 1;
  background: var(--color-sidebar-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
  position: relative;
  overflow: hidden;
  transition: padding 0.6s ease;
}

.orb {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  transition: opacity 0.35s ease;
}

.orb-1 {
  width: 420px; height: 420px;
  top: -140px; right: -140px;
  background: radial-gradient(circle, rgba(233, 30, 140, 0.2) 0%, transparent 70%);
  animation: float 8s ease-in-out infinite;
}

.orb-2 {
  width: 300px; height: 300px;
  bottom: -100px; left: -100px;
  background: radial-gradient(circle, rgba(233, 30, 140, 0.12) 0%, transparent 70%);
  animation: float 10s ease-in-out infinite reverse;
}

.orb-3 {
  width: 180px; height: 180px;
  top: 50%; left: 30%;
  background: radial-gradient(circle, rgba(233, 30, 140, 0.07) 0%, transparent 70%);
  animation: float 6s ease-in-out infinite 2s;
}

@keyframes float {
  0%, 100% { transform: translateY(0px) scale(1); }
  50%       { transform: translateY(-20px) scale(1.04); }
}

.left-content {
  max-width: 380px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  position: relative;
  z-index: 1;
  transition: gap 0.5s ease 0.25s;
}

.brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: visible;
}

.brand-slogan {
  margin: 0;
  font-size: 26px;
  font-weight: 800;
  font-family: 'Raleway', sans-serif;
  color: #ffffff;
  letter-spacing: 0.2px;
  text-align: center;
  white-space: nowrap;
  max-height: 0;
  opacity: 0;
  overflow: hidden;
}

@keyframes slogan-in {
  from {
    opacity: 0;
    letter-spacing: 10px;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    letter-spacing: 0.2px;
    transform: translateY(0);
  }
}

.brand-logo-img {
  width: 200px;
  height: auto;
  display: block;
  animation: heartbeat 2.5s ease-in-out infinite;
  filter:
    drop-shadow(0 0 4px rgba(233, 30, 140, 1))
    drop-shadow(0 0 12px rgba(233, 30, 140, 0.75))
    drop-shadow(0 0 24px rgba(233, 30, 140, 0.45));
  transition:
    width 0.65s cubic-bezier(0.22, 1, 0.36, 1) 0.2s,
    filter 0.65s ease 0.2s;
}

@keyframes heartbeat {
  0%, 100% { transform: scale(1); }
  14%       { transform: scale(1.04); }
  28%       { transform: scale(1); }
  42%       { transform: scale(1.03); }
  56%       { transform: scale(1); }
}

/* Collapsible section (hero text + features) */
.collapsible-content {
  display: flex;
  flex-direction: column;
  gap: 28px;
  overflow: hidden;
  max-height: 600px;
  transition: max-height 0.55s ease 0.1s, opacity 0.3s ease, gap 0.4s ease 0.1s;
}

.left-hero h2 {
  font-size: 28px;
  font-weight: 800;
  color: #ffffff;
  line-height: 1.3;
  letter-spacing: -0.5px;
  margin-bottom: 14px;
}

.left-hero p {
  font-size: 14px;
  color: var(--color-sidebar-text);
  line-height: 1.7;
}

.left-features {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13.5px;
  color: var(--color-sidebar-text);
  transition: color 0.2s ease, transform 0.2s ease;
}

.feature-item:hover {
  color: #ffffff;
  transform: translateX(4px);
}

.feature-icon {
  width: 32px; height: 32px;
  border-radius: 8px;
  background: rgba(233, 30, 140, 0.15);
  border: 1px solid rgba(233, 30, 140, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-primary);
  font-size: 13px;
  flex-shrink: 0;
  transition: background 0.2s ease, transform 0.2s ease;
}

.feature-item:hover .feature-icon {
  background: rgba(233, 30, 140, 0.25);
  transform: scale(1.1);
}

/* ============================================================
   Right panel
   ============================================================ */
.signin-right {
  width: 480px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 40px;
  background: var(--color-surface);
  overflow: hidden;
  transition:
    width 0.55s cubic-bezier(0.4, 0, 0.2, 1),
    padding 0.55s cubic-bezier(0.4, 0, 0.2, 1),
    opacity 0.35s ease;
}

.form-card {
  width: 100%;
  max-width: 360px;
}

.form-header { margin-bottom: 28px; }

.form-header h1 {
  font-size: 22px;
  font-weight: 800;
  color: var(--color-text-primary);
  letter-spacing: -0.3px;
}

.form-header p {
  font-size: 13.5px;
  color: var(--color-text-secondary);
  margin-top: 4px;
}

.google-btn-wrap {
  display: flex;
  justify-content: center;
  width: 100%;
}

.divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 22px 0;
  font-size: 12px;
  color: var(--color-text-muted);
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--color-border);
}

.error-msg {
  display: flex;
  align-items: center;
  gap: 7px;
  background: var(--color-critical-bg);
  border: 1px solid var(--color-critical-border);
  color: var(--color-critical);
  font-size: 13px;
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  margin-bottom: 16px;
}

.error-msg.shake { animation: shake 0.45s ease; }

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  15%       { transform: translateX(-6px); }
  30%       { transform: translateX(6px); }
  45%       { transform: translateX(-4px); }
  60%       { transform: translateX(4px); }
  75%       { transform: translateX(-2px); }
  90%       { transform: translateX(2px); }
}

.error-enter-active { animation: error-in 0.25s ease; }
.error-leave-active { animation: error-in 0.2s ease reverse; }

@keyframes error-in {
  from { opacity: 0; transform: translateY(-6px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

.name-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.fields-enter-active, .fields-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.fields-enter-from { opacity: 0; transform: translateY(-8px); }
.fields-leave-to   { opacity: 0; transform: translateY(-8px); }

.signin-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

label {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.forgot-link {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-primary);
  text-decoration: none;
  transition: color 0.15s ease;
}

.forgot-link:hover {
  color: var(--color-primary-dark);
  text-decoration: underline;
}

.input-wrap { position: relative; }

.input-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 13px;
  color: var(--color-text-muted);
  pointer-events: none;
  transition: color 0.15s ease;
}

.input-wrap:focus-within .input-icon { color: var(--color-primary); }

input {
  width: 100%;
  padding: 10px 14px 10px 36px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 13.5px;
  color: var(--color-text-primary);
  background: var(--color-surface);
  outline: none;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
  font-family: inherit;
}

input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(233, 30, 140, 0.1);
  transform: translateY(-1px);
}

input::placeholder { color: var(--color-text-muted); }

.signin-btn {
  width: 100%;
  padding: 11px;
  background: var(--color-primary);
  color: #ffffff;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 4px;
  transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
  position: relative;
  overflow: hidden;
}

.signin-btn::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 60%);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.signin-btn:hover:not(:disabled)::after { opacity: 1; }

.signin-btn:hover:not(:disabled) {
  background: var(--color-primary-dark);
  box-shadow: 0 4px 18px rgba(233, 30, 140, 0.4);
  transform: translateY(-1px);
}

.signin-btn:active:not(:disabled) {
  transform: translateY(0) scale(0.98);
  box-shadow: 0 2px 8px rgba(233, 30, 140, 0.3);
}

.signin-btn:disabled { opacity: 0.75; cursor: not-allowed; }

.signup-link {
  text-align: center;
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-top: 22px;
}

.signup-link a {
  color: var(--color-primary);
  font-weight: 600;
  text-decoration: none;
  transition: color 0.15s ease;
}

.signup-link a:hover {
  color: var(--color-primary-dark);
  text-decoration: underline;
}

/* ============================================================
   Entrance animations
   ============================================================ */
.animate-fade-up   { animation: fade-up   0.5s ease both; }
.animate-fade-down { animation: fade-down 0.5s ease both; }

@keyframes fade-up {
  from { opacity: 0; transform: translateY(18px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes fade-down {
  from { opacity: 0; transform: translateY(-12px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ============================================================
   Login success animation
   ============================================================ */

/* 1. Right panel collapses */
.animating .signin-right {
  width: 0;
  padding: 0;
  opacity: 0;
  pointer-events: none;
}

/* 2. Orbs fade out */
.animating .orb { opacity: 0; }

/* 3. Text content collapses */
.animating .collapsible-content {
  max-height: 0;
  opacity: 0;
  gap: 0;
}

/* 4. Left content gap closes so logo sits center */
.animating .left-content { gap: 0; }

/* 4c. Slogan appears after logo expansion (~0.85s) */
.animating .brand-slogan {
  width: 480px;
  max-height: 4em;
  margin-top: 16px;
  margin-left: 24px;
  animation: slogan-in 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.85s both;
}

/* 5. Logo grows, glows, then pulses — pulse delay matches expansion end */
.animating .brand-logo-img {
  width: 480px;
  animation: logo-enter-pulse 1.2s ease-in-out 0.8s infinite;
  filter:
    drop-shadow(0 0 10px rgba(233, 30, 140, 1))
    drop-shadow(0 0 32px rgba(233, 30, 140, 0.9))
    drop-shadow(0 0 72px rgba(233, 30, 140, 0.6))
    drop-shadow(0 0 120px rgba(233, 30, 140, 0.3));
}

@keyframes logo-enter-pulse {
  0%, 100% { transform: scale(1); }
  50%       { transform: scale(1.07); }
}
</style>
