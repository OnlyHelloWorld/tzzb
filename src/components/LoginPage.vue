<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-logo">📊</div>
      <h1 class="login-title">投资账本</h1>
      <p class="login-subtitle">请登录以继续</p>
      <form @submit.prevent="handleLogin">
        <div class="login-field">
          <label>账号</label>
          <input
            v-model="username"
            class="login-input"
            placeholder="请输入账号"
            autocomplete="username"
            :disabled="loading"
          />
        </div>
        <div class="login-field">
          <label>密码</label>
          <input
            v-model="password"
            class="login-input"
            type="password"
            placeholder="请输入密码"
            autocomplete="current-password"
            :disabled="loading"
          />
        </div>
        <div v-if="error" class="login-error">{{ error }}</div>
        <button class="login-btn" type="submit" :disabled="loading">
          {{ loading ? '登录中...' : '登录' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  loginError: { type: String, default: '' }
})

const emit = defineEmits(['login'])

const username = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

// 同步外部传入的 loginError
watch(() => props.loginError, (val) => {
  error.value = val
})

const handleLogin = () => {
  error.value = ''
  loading.value = true
  emit('login', { username: username.value, password: password.value })
  loading.value = false
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f9f7f3;
  padding: 20px;
}

.login-card {
  background: #fff;
  border-radius: 16px;
  padding: 40px 32px;
  width: 100%;
  max-width: 360px;
  box-shadow: 0 2px 20px rgba(0,0,0,0.06);
  text-align: center;
}

.login-logo {
  font-size: 48px;
  margin-bottom: 12px;
}

.login-title {
  font-family: 'Source Serif 4', serif;
  font-size: 24px;
  font-weight: 600;
  color: #1a1814;
  margin: 0 0 4px;
}

.login-subtitle {
  font-size: 13px;
  color: #999;
  margin: 0 0 28px;
}

.login-field {
  text-align: left;
  margin-bottom: 16px;
}

.login-field label {
  display: block;
  font-size: 12px;
  color: #666;
  margin-bottom: 6px;
  font-weight: 500;
}

.login-input {
  width: 100%;
  padding: 10px 14px;
  border: 1.5px solid #e0ddd6;
  border-radius: 10px;
  font-size: 15px;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
  background: #faf9f7;
}

.login-input:focus {
  border-color: #1a1814;
  background: #fff;
}

.login-input:disabled {
  opacity: 0.6;
}

.login-error {
  background: #fff0f0;
  color: #c0392b;
  font-size: 12px;
  padding: 8px 12px;
  border-radius: 8px;
  margin-bottom: 16px;
}

.login-btn {
  width: 100%;
  padding: 12px;
  background: #1a1814;
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.2s;
}

.login-btn:hover {
  opacity: 0.85;
}

.login-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
