<template>
  <div class="app-container">
    <router-view v-slot="{ Component }">
      <transition name="page" mode="out-in">
        <component :is="Component" @login="handleLogin" />
      </transition>
    </router-view>
  </div>
</template>

<script>
import router from './router/index.js'

export default {
  name: 'App',
  methods: {
    handleLogin() {
      router.push('/home')
    }
  }
}
</script>

<style>
/* 引入全局样式 */
@import './styles.css';
</style>