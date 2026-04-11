<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-header">
        <div class="login-logo">📊</div>
        <div class="login-about">
          <router-link to="/about" class="about-link">关于</router-link>
        </div>
      </div>
      <h1 class="login-title">投资账本</h1>

      <!-- ── 登录 ── -->
      <template v-if="view === 'login'">
        <p class="login-subtitle">请登录以继续</p>
        <form @submit.prevent="handleLogin">
          <div class="login-field">
            <label for="username">账号（邮箱或用户名）</label>
            <input id="username" name="username" v-model="form.username" class="login-input" placeholder="请输入邮箱或用户名" autocomplete="username" :disabled="loading" />
          </div>
          <div class="login-field">
            <label for="password">密码</label>
            <input id="password" name="password" v-model="form.password" class="login-input" type="password" placeholder="请输入密码" autocomplete="current-password" :disabled="loading" />
          </div>
          <div v-if="error" class="login-error">{{ error }}</div>
          <button class="login-btn" type="submit" :disabled="loading">{{ loading ? '登录中...' : '登录' }}</button>
        </form>
        <div class="login-links">
          <a href="#" @click.prevent="switchView('register')">注册账号</a>
          <a href="#" @click.prevent="switchView('reset')">忘记密码</a>
        </div>
      </template>

      <!-- ── 注册 ── -->
      <template v-if="view === 'register'">
        <p class="login-subtitle">创建新账号</p>
        <form @submit.prevent="handleRegister">
          <div class="login-field">
            <label for="email">邮箱</label>
            <div class="code-row">
              <input id="email" name="email" v-model="form.email" class="login-input code-input" placeholder="请输入邮箱" type="email" :disabled="loading" />
              <button type="button" class="code-btn" :disabled="codeCooldown > 0 || loading" @click="handleSendCode('register')">
                {{ codeCooldown > 0 ? `${codeCooldown}s` : '发送验证码' }}
              </button>
            </div>
          </div>
          <div class="login-field">
            <label for="code">验证码</label>
            <input id="code" name="code" v-model="form.code" class="login-input" placeholder="6 位验证码" maxlength="6" :disabled="loading" />
          </div>
          <div class="login-field">
            <label for="register-username">用户名</label>
            <input id="register-username" name="register-username" v-model="form.username" class="login-input" placeholder="2-64 个字符" :disabled="loading" />
          </div>
          <div class="login-field">
            <label for="register-password">密码</label>
            <input id="register-password" name="register-password" v-model="form.password" class="login-input" type="password" placeholder="至少 6 个字符" :disabled="loading" />
          </div>
          <div class="login-field">
            <label for="confirm-password">确认密码</label>
            <input id="confirm-password" name="confirm-password" v-model="form.password2" class="login-input" type="password" placeholder="再次输入密码" :disabled="loading" />
          </div>
          <div v-if="error" class="login-error">{{ error }}</div>
          <div v-if="successMsg" class="login-success">{{ successMsg }}</div>
          <button class="login-btn" type="submit" :disabled="loading">{{ loading ? '注册中...' : '注册' }}</button>
        </form>
        <div class="login-links">
          <a href="#" @click.prevent="switchView('login')">返回登录</a>
        </div>
      </template>

      <!-- ── 重置密码 ── -->
      <template v-if="view === 'reset'">
        <p class="login-subtitle">重置密码</p>
        <form @submit.prevent="handleReset">
          <div class="login-field">
            <label for="reset-email">邮箱</label>
            <div class="code-row">
              <input id="reset-email" name="reset-email" v-model="form.email" class="login-input code-input" placeholder="注册时使用的邮箱" type="email" :disabled="loading" />
              <button type="button" class="code-btn" :disabled="codeCooldown > 0 || loading" @click="handleSendCode('reset')">
                {{ codeCooldown > 0 ? `${codeCooldown}s` : '发送验证码' }}
              </button>
            </div>
          </div>
          <div class="login-field">
            <label for="reset-code">验证码</label>
            <input id="reset-code" name="reset-code" v-model="form.code" class="login-input" placeholder="6 位验证码" maxlength="6" :disabled="loading" />
          </div>
          <div class="login-field">
            <label for="reset-password">新密码</label>
            <input id="reset-password" name="reset-password" v-model="form.password" class="login-input" type="password" placeholder="至少 6 个字符" :disabled="loading" />
          </div>
          <div class="login-field">
            <label for="reset-confirm-password">确认新密码</label>
            <input id="reset-confirm-password" name="reset-confirm-password" v-model="form.password2" class="login-input" type="password" placeholder="再次输入新密码" :disabled="loading" />
          </div>
          <div v-if="error" class="login-error">{{ error }}</div>
          <div v-if="successMsg" class="login-success">{{ successMsg }}</div>
          <button class="login-btn" type="submit" :disabled="loading">{{ loading ? '提交中...' : '重置密码' }}</button>
        </form>
        <div class="login-links">
          <a href="#" @click.prevent="switchView('login')">返回登录</a>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import * as api from '../lib/api.js'

const props = defineProps({
  loginError: { type: String, default: '' }
})

const router = useRouter()
const view = ref('login') // login | register | reset
const error = ref('')
const successMsg = ref('')
const loading = ref(false)
const codeCooldown = ref(0)
let cooldownTimer = null

const form = reactive({
  username: '',
  email: '',
  code: '',
  password: '',
  password2: '',
})

watch(() => props.loginError, (val) => {
  if (val) error.value = val
})

function switchView(v) {
  view.value = v
  error.value = ''
  successMsg.value = ''
  form.code = ''
  form.password = ''
  form.password2 = ''
}

const syncHashByView = () => {
  const map = { login: '#/login', register: '#/register', reset: '#/reset-password' }
  window.history.replaceState(null, '', map[view.value] || '#/login')
}

function clearForm() {
  form.username = ''
  form.email = ''
  form.code = ''
  form.password = ''
  form.password2 = ''
}

async function handleSendCode(type) {
  if (!form.email) { error.value = '请输入邮箱'; return }
  error.value = ''
  try {
    await api.sendCode(form.email, type)
    successMsg.value = '验证码已发送，请查收邮箱'
    codeCooldown.value = 60
    cooldownTimer = setInterval(() => {
      codeCooldown.value--
      if (codeCooldown.value <= 0) clearInterval(cooldownTimer)
    }, 1000)
  } catch (e) {
    error.value = e.message
  }
}

async function handleLogin() {
  if (!form.username || !form.password) { error.value = '请输入账号和密码'; return }
  error.value = ''
  loading.value = true
  try {
    await api.login(form.username, form.password)
    router.push('/home')
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function handleRegister() {
  if (!form.email || !form.code || !form.username || !form.password) {
    error.value = '请填写所有字段'; return
  }
  if (form.username.length < 2 || form.username.length > 64) {
    error.value = '用户名长度需为 2-64 个字符'; return
  }
  if (form.password !== form.password2) { error.value = '两次密码不一致'; return }
  if (form.password.length < 6) { error.value = '密码至少 6 个字符'; return }
  error.value = ''
  loading.value = true
  try {
    await api.register(form.email, form.code, form.username, form.password)
    router.push('/home')
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function handleReset() {
  if (!form.email || !form.code || !form.password) {
    error.value = '请填写所有字段'; return
  }
  if (form.password !== form.password2) { error.value = '两次密码不一致'; return }
  if (form.password.length < 6) { error.value = '密码至少 6 个字符'; return }
  error.value = ''
  successMsg.value = ''
  loading.value = true
  try {
    await api.resetPassword(form.email, form.code, form.password)
    successMsg.value = '密码重置成功，请返回登录'
    setTimeout(() => switchView('login'), 2000)
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

onUnmounted(() => {
  if (cooldownTimer) clearInterval(cooldownTimer)
})

watch(view, syncHashByView)

onMounted(() => {
  const hash = window.location.hash
  if (hash === '#/register') view.value = 'register'
  else if (hash === '#/reset-password') view.value = 'reset'
  else view.value = 'login'
  syncHashByView()
})
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
  max-width: 380px;
  box-shadow: 0 2px 20px rgba(0,0,0,0.06);
  text-align: center;
}

.login-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.login-logo { font-size: 48px; }

.login-about {
  margin-left: auto;
}

.about-link {
  color: #888;
  text-decoration: none;
  font-size: 14px;
  padding: 6px 12px;
  border-radius: 6px;
  transition: all 0.2s;
}

.about-link:hover {
  color: #1a1814;
  background: #f0ede7;
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
  margin: 0 0 24px;
}

.login-field {
  text-align: left;
  margin-bottom: 14px;
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

.login-input:focus { border-color: #1a1814; background: #fff; }
.login-input:disabled { opacity: 0.6; }

.code-row {
  display: flex;
  gap: 8px;
}

.code-input {
  flex: 1;
}

.code-btn {
  flex-shrink: 0;
  padding: 10px 14px;
  background: #1a1814;
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
  transition: opacity 0.2s;
}

.code-btn:hover { opacity: 0.85; }
.code-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.login-error {
  background: #fff0f0;
  color: #c0392b;
  font-size: 12px;
  padding: 8px 12px;
  border-radius: 8px;
  margin-bottom: 14px;
}

.login-success {
  background: #edf7f1;
  color: #1a7a4a;
  font-size: 12px;
  padding: 8px 12px;
  border-radius: 8px;
  margin-bottom: 14px;
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
  margin-top: 4px;
}

.login-btn:hover { opacity: 0.85; }
.login-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.login-links {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 20px;
  font-size: 13px;
}

.login-links a {
  color: #888;
  text-decoration: none;
  cursor: pointer;
}

.login-links a:hover { color: #1a1814; }
</style>
