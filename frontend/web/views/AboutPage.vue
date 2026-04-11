<template>
  <div class="about-page">
    <!-- 导航栏 -->
    <nav class="about-nav">
      <div class="about-nav-left">
        <span class="about-logo">📊</span>
        <h1 class="about-title">投资账本</h1>
      </div>
      <div class="about-nav-right">
        <button class="about-btn" @click="goToLogin">登录</button>
      </div>
    </nav>

    <!-- 英雄区域 -->
    <section class="hero-section">
      <div class="hero-content">
        <h2 class="hero-title">智能投资管理工具</h2>
        <p class="hero-subtitle">多账本、多市场、实时分析，助您轻松管理投资组合</p>
        <button class="hero-btn" @click="goToLogin">开始使用</button>
      </div>
      <div class="hero-image">
        <img src="https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=modern%20investment%20dashboard%20with%20charts%20and%20portfolio%20analysis%20on%20mobile%20device&image_size=landscape_16_9" alt="投资账本界面">
      </div>
    </section>

    <!-- 功能特性 -->
    <section class="features-section">
      <h3 class="section-title">核心功能</h3>
      <div class="features-grid">
        <div class="feature-card">
          <div class="feature-icon">📋</div>
          <h4 class="feature-title">多账本管理</h4>
          <p class="feature-desc">创建多个独立账本，实现资产分类管理，数据完全隔离</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">🌍</div>
          <h4 class="feature-title">多市场支持</h4>
          <p class="feature-desc">支持A股、港股、美股三大市场，统一管理全球投资</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">📈</div>
          <h4 class="feature-title">实时分析</h4>
          <p class="feature-desc">实时获取行情数据，自动计算市值、盈亏和收益率</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">💱</div>
          <h4 class="feature-title">汇率转换</h4>
          <p class="feature-desc">自动汇率转换，统一以人民币计算总市值</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">📊</div>
          <h4 class="feature-title">数据导出</h4>
          <p class="feature-desc">支持JSON、CSV、PDF三种格式导入导出</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">🔒</div>
          <h4 class="feature-title">安全认证</h4>
          <p class="feature-desc">JWT认证机制，保障您的投资数据安全</p>
        </div>
      </div>
    </section>

    <!-- 界面展示 -->
    <section class="demo-section">
      <h3 class="section-title">界面展示</h3>
      <div class="demo-grid">
        <div class="demo-card">
          <img src="https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=investment%20portfolio%20dashboard%20showing%20total%20value%20and%20market%20distribution%20on%20mobile&image_size=square" alt="总览界面">
          <p class="demo-caption">投资总览</p>
        </div>
        <div class="demo-card">
          <img src="https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=investment%20ledger%20detail%20page%20showing%20individual%20stocks%20and%20performance%20on%20mobile&image_size=square" alt="账本详情">
          <p class="demo-caption">账本详情</p>
        </div>
        <div class="demo-card">
          <img src="https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=adding%20new%20investment%20holding%20form%20on%20mobile%20app&image_size=square" alt="添加持仓">
          <p class="demo-caption">添加持仓</p>
        </div>
      </div>
    </section>

    <!-- 底部 -->
    <footer class="about-footer">
      <p class="footer-text">投资账本 © 2026 | 专业的个人投资组合管理工具</p>
    </footer>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

function goToLogin() {
  router.push('/login')
}
</script>

<style scoped>
.about-page {
  min-height: 100vh;
  background: #f9f7f3;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* 导航栏 */
.about-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 32px;
  background: #fff;
  box-shadow: 0 2px 10px rgba(0,0,0,0.05);
  position: sticky;
  top: 0;
  z-index: 100;
}

.about-nav-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.about-logo {
  font-size: 24px;
}

.about-title {
  font-size: 18px;
  font-weight: 600;
  color: #1a1814;
  margin: 0;
}

.about-nav-right {
  display: flex;
  gap: 12px;
}

.about-btn {
  padding: 8px 16px;
  background: #1a1814;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.2s;
}

.about-btn:hover {
  opacity: 0.85;
}

/* 英雄区域 */
.hero-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 20px;
  text-align: center;
  background: linear-gradient(135deg, #f9f7f3 0%, #f0ede7 100%);
}

.hero-content {
  max-width: 600px;
  margin-bottom: 40px;
}

.hero-title {
  font-size: 32px;
  font-weight: 700;
  color: #1a1814;
  margin: 0 0 16px;
  line-height: 1.2;
}

.hero-subtitle {
  font-size: 16px;
  color: #666;
  margin: 0 0 32px;
  line-height: 1.5;
}

.hero-btn {
  padding: 14px 32px;
  background: #1a1814;
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.2s;
}

.hero-btn:hover {
  opacity: 0.85;
  transform: translateY(-2px);
}

.hero-image {
  width: 100%;
  max-width: 800px;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0,0,0,0.1);
}

.hero-image img {
  width: 100%;
  height: auto;
  display: block;
}

/* 功能特性 */
.features-section {
  padding: 80px 20px;
  background: #fff;
}

.section-title {
  font-size: 24px;
  font-weight: 600;
  color: #1a1814;
  text-align: center;
  margin: 0 0 48px;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.feature-card {
  background: #f9f7f3;
  border-radius: 16px;
  padding: 32px;
  text-align: center;
  transition: transform 0.2s, box-shadow 0.2s;
}

.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.08);
}

.feature-icon {
  font-size: 40px;
  margin-bottom: 16px;
}

.feature-title {
  font-size: 18px;
  font-weight: 600;
  color: #1a1814;
  margin: 0 0 12px;
}

.feature-desc {
  font-size: 14px;
  color: #666;
  margin: 0;
  line-height: 1.5;
}

/* 界面展示 */
.demo-section {
  padding: 80px 20px;
  background: #f9f7f3;
}

.demo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
  max-width: 1000px;
  margin: 0 auto;
}

.demo-card {
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0,0,0,0.06);
  transition: transform 0.2s, box-shadow 0.2s;
}

.demo-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.1);
}

.demo-card img {
  width: 100%;
  height: 200px;
  object-fit: cover;
  display: block;
}

.demo-caption {
  padding: 16px;
  text-align: center;
  font-size: 14px;
  font-weight: 500;
  color: #1a1814;
  margin: 0;
}

/* 底部 */
.about-footer {
  background: #1a1814;
  color: #fff;
  text-align: center;
  padding: 32px 20px;
}

.footer-text {
  font-size: 14px;
  opacity: 0.8;
  margin: 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .hero-title {
    font-size: 24px;
  }
  
  .hero-subtitle {
    font-size: 14px;
  }
  
  .features-section,
  .demo-section {
    padding: 60px 20px;
  }
  
  .features-grid,
  .demo-grid {
    grid-template-columns: 1fr;
  }
}
</style>