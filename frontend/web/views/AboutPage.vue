<template>
  <div class="about-page">
    <header class="about-header">
      <h1>投资账本</h1>
      <p>投资账本帮助你快速查看总资产、管理账本与持仓，并跟踪盈亏变化。</p>
      <div class="header-actions">
        <RouterLink class="btn" to="/login">去登录页</RouterLink>
        <RouterLink class="btn btn-light" to="/home">去首页</RouterLink>
      </div>
    </header>

    <main class="about-content">
      <section v-for="item in sections" :key="item.title">
        <p class="section-title">{{ item.title }}</p>
        <img class="shot" :src="item.src" :alt="item.title" />
      </section>

      <section class="footer-entry">
        <p>如果你需要重新登录，可以随时点击下方入口返回登录页。</p>
        <RouterLink class="btn" to="/login">返回登录页</RouterLink>
      </section>
    </main>
  </div>
</template>

<script setup>
const sections = [
  {
    title: '主要功能：查看账本市值排行。',
    src: '/guide-images/01-ledger-rank.svg'
  },
  {
    title: '主要功能：查看所有账本总览。',
    src: '/guide-images/02-home-overview.svg'
  },
  {
    title: '主要功能：查看单个账本和持仓。',
    src: '/guide-images/03-ledger-detail.svg'
  },
  {
    title: '主要功能：查看标的市值排行。',
    src: '/guide-images/04-holding-rank.svg'
  },
  {
    title: '主要功能：添加一条新持仓。',
    src: '/guide-images/05-add-holding.svg'
  }
]
</script>

<style scoped>
.about-page {
  min-height: 100vh;
  background: #f4f2ee;
  color: #1b1812;
}

.about-header,
.about-content {
  max-width: 880px;
  margin: 0 auto;
  padding: 24px 20px;
}

.about-header h1 {
  margin: 0 0 8px;
  font-size: 28px;
}

.about-header p {
  margin: 0;
  line-height: 1.7;
}

.header-actions {
  margin-top: 12px;
  display: flex;
  gap: 10px;
}

section {
  background: #fff;
  border: 1px solid #e7e1d7;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.section-title {
  margin: 0 0 10px;
  font-size: 16px;
  line-height: 1.7;
}

.shot {
  width: 100%;
  border: 1px solid #e6e2db;
  border-radius: 10px;
  background: #fafafa;
}

.footer-entry p {
  margin: 0 0 10px;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 100px;
  height: 36px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid #1b1812;
  background: #1b1812;
  color: #fff;
  text-decoration: none;
}

.btn-light {
  background: #fff;
  color: #1b1812;
}
</style>
