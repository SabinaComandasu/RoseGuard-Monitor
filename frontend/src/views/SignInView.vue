<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')
const shakeError = ref(false)

async function handleSignIn() {
  if (!email.value || !password.value) {
    error.value = 'Please enter your email and password.'
    triggerShake()
    return
  }
  error.value = ''
  loading.value = true
  setTimeout(() => {
    loading.value = false
    router.push('/dashboard')
  }, 800)
}

function triggerShake() {
  shakeError.value = false
  requestAnimationFrame(() => {
    shakeError.value = true
    setTimeout(() => { shakeError.value = false }, 500)
  })
}

function handleGoogleSignIn() {
  router.push('/dashboard')
}
</script>

<template>
  <div class="signin-page">
    <!-- Left panel -->
    <div class="signin-left">
      <!-- Floating orbs -->
      <div class="orb orb-1" />
      <div class="orb orb-2" />
      <div class="orb orb-3" />

      <div class="left-content">
        <div class="brand animate-fade-down">
          <span class="brand-icon">🌹</span>
          <div>
            <div class="brand-name">RoseGuard</div>
            <div class="brand-sub">Monitor</div>
          </div>
        </div>

        <div class="left-hero animate-fade-up" style="animation-delay: 0.1s">
          <h2>Monitor your health,<br />live better every day.</h2>
          <p>
            Real-time biometric data from your wearable sensor —
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
            <span>Health KPIs & trend analysis</span>
          </div>
          <div class="feature-item animate-fade-up" style="animation-delay: 0.36s">
            <span class="feature-icon"><i class="pi pi-file-pdf" /></span>
            <span>Professional PDF health reports</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Right panel -->
    <div class="signin-right">
      <div class="form-card animate-fade-up">
        <div class="form-header">
          <h1>Welcome back</h1>
          <p>Sign in to your RoseGuard account</p>
        </div>

        <!-- Google button -->
        <button class="google-btn" @click="handleGoogleSignIn">
          <svg class="google-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <div class="divider">
          <span>or sign in with email</span>
        </div>

        <!-- Error message -->
        <Transition name="error">
          <div v-if="error" class="error-msg" :class="{ shake: shakeError }">
            <i class="pi pi-exclamation-circle" /> {{ error }}
          </div>
        </Transition>

        <!-- Form -->
        <form class="signin-form" @submit.prevent="handleSignIn">
          <div class="field">
            <label for="email">Email address</label>
            <div class="input-wrap">
              <i class="pi pi-envelope input-icon" />
              <input
                id="email"
                v-model="email"
                type="email"
                placeholder="you@example.com"
                autocomplete="email"
              />
            </div>
          </div>

          <div class="field">
            <div class="label-row">
              <label for="password">Password</label>
              <a href="#" class="forgot-link">Forgot password?</a>
            </div>
            <div class="input-wrap">
              <i class="pi pi-lock input-icon" />
              <input
                id="password"
                v-model="password"
                type="password"
                placeholder="••••••••"
                autocomplete="current-password"
              />
            </div>
          </div>

          <button type="submit" class="signin-btn" :class="{ loading }" :disabled="loading">
            <i v-if="loading" class="pi pi-spin pi-spinner" />
            <span>{{ loading ? 'Signing in…' : 'Sign in' }}</span>
          </button>
        </form>

        <p class="signup-link">
          Don't have an account? <a href="#">Create one</a>
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
}

/* Animated floating orbs */
.orb {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}

.orb-1 {
  width: 420px;
  height: 420px;
  top: -140px;
  right: -140px;
  background: radial-gradient(circle, rgba(233, 30, 140, 0.2) 0%, transparent 70%);
  animation: float 8s ease-in-out infinite;
}

.orb-2 {
  width: 300px;
  height: 300px;
  bottom: -100px;
  left: -100px;
  background: radial-gradient(circle, rgba(233, 30, 140, 0.12) 0%, transparent 70%);
  animation: float 10s ease-in-out infinite reverse;
}

.orb-3 {
  width: 180px;
  height: 180px;
  top: 50%;
  left: 30%;
  background: radial-gradient(circle, rgba(233, 30, 140, 0.07) 0%, transparent 70%);
  animation: float 6s ease-in-out infinite 2s;
}

@keyframes float {
  0%, 100% { transform: translateY(0px) scale(1); }
  50% { transform: translateY(-20px) scale(1.04); }
}

.left-content {
  max-width: 380px;
  display: flex;
  flex-direction: column;
  gap: 40px;
  position: relative;
  z-index: 1;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-icon {
  font-size: 32px;
  animation: heartbeat 2.5s ease-in-out infinite;
}

@keyframes heartbeat {
  0%, 100% { transform: scale(1); }
  14% { transform: scale(1.15); }
  28% { transform: scale(1); }
  42% { transform: scale(1.1); }
  56% { transform: scale(1); }
}

.brand-name {
  font-size: 18px;
  font-weight: 700;
  color: #ffffff;
}

.brand-sub {
  font-size: 12px;
  color: var(--color-sidebar-text);
  letter-spacing: 0.5px;
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
  width: 32px;
  height: 32px;
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
}

.form-card {
  width: 100%;
  max-width: 360px;
}

.form-header {
  margin-bottom: 28px;
}

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

/* Google button */
.google-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 11px 16px;
  border: 1.5px solid #e0e0e0;
  border-radius: var(--radius-sm);
  background: #ffffff;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--color-text-primary);
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
}

.google-btn:hover {
  border-color: #bdbdbd;
  background: #fafafa;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

.google-btn:active {
  transform: translateY(0px) scale(0.98);
}

.google-icon {
  width: 18px;
  height: 18px;
}

/* Divider */
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

/* Error */
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

.error-msg.shake {
  animation: shake 0.45s ease;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  15%       { transform: translateX(-6px); }
  30%       { transform: translateX(6px); }
  45%       { transform: translateX(-4px); }
  60%       { transform: translateX(4px); }
  75%       { transform: translateX(-2px); }
  90%       { transform: translateX(2px); }
}

/* Error transition */
.error-enter-active { animation: error-in 0.25s ease; }
.error-leave-active { animation: error-in 0.2s ease reverse; }

@keyframes error-in {
  from { opacity: 0; transform: translateY(-6px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

/* Form fields */
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

.input-wrap {
  position: relative;
}

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

.input-wrap:focus-within .input-icon {
  color: var(--color-primary);
}

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

input::placeholder {
  color: var(--color-text-muted);
}

/* Sign in button */
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

.signin-btn:hover:not(:disabled)::after {
  opacity: 1;
}

.signin-btn:hover:not(:disabled) {
  background: var(--color-primary-dark);
  box-shadow: 0 4px 18px rgba(233, 30, 140, 0.4);
  transform: translateY(-1px);
}

.signin-btn:active:not(:disabled) {
  transform: translateY(0) scale(0.98);
  box-shadow: 0 2px 8px rgba(233, 30, 140, 0.3);
}

.signin-btn:disabled {
  opacity: 0.75;
  cursor: not-allowed;
}

/* Sign up link */
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
.animate-fade-up {
  animation: fade-up 0.5s ease both;
}

.animate-fade-down {
  animation: fade-down 0.5s ease both;
}

@keyframes fade-up {
  from { opacity: 0; transform: translateY(18px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes fade-down {
  from { opacity: 0; transform: translateY(-12px); }
  to   { opacity: 1; transform: translateY(0); }
}
</style>
