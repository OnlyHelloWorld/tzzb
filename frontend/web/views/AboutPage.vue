<template>
  <div class="about-page">
    <header class="about-header">
      <div class="brand">
        <div class="brand-logo" aria-hidden="true">
          <svg width="30" height="30" viewBox="0 0 28 28" fill="none">
            <rect width="28" height="28" rx="7" fill="#13110d"/>
            <path d="M7 9h14M7 14h10M7 19h12" stroke="#f7f3ea" stroke-width="1.8" stroke-linecap="round"/>
            <circle cx="21" cy="19" r="3.5" fill="#d4af61"/>
          </svg>
        </div>
        <div>
          <h1>投资账本</h1>
          <p>面向个人投资记录与汇总的账本工具</p>
        </div>
      </div>
      <button class="primary-btn" @click="goToLogin">立即登录</button>
    </header>

    <main class="about-content">
      <section class="hero">
        <div class="hero-copy">
          <span class="pill">多市场 · 多账本 · 实时分析</span>
          <h2>清楚记录持仓，方便日常查看与汇总</h2>
          <p>
            支持 A 股、港股、美股统一管理，并换算人民币总资产。
            页面信息按模块展示，重点数据清晰、留白充足，便于日常使用。
          </p>
          <div class="hero-actions">
            <button class="primary-btn" @click="goToLogin">开始使用</button>
            <button class="ghost-btn" @click="scrollToPreview">查看界面</button>
          </div>
        </div>
        <div class="hero-panel" role="img" aria-label="总览示意图">
          <div class="panel-top">
            <strong>所有账本总市值（人民币）</strong>
            <span>6 个账本</span>
          </div>
          <div class="value-row">
            <em>¥ 574,235.46</em>
            <b>-5.81%</b>
          </div>
          <ul>
            <li><span>A股</span><span>¥295,759.80（51.5%）</span></li>
            <li><span>港股</span><span>HK$139,905.00 ≈ ¥122,215.86</span></li>
            <li><span>美股</span><span>$22,845.00 ≈ ¥156,259.80</span></li>
          </ul>
        </div>
      </section>

      <section class="capability">
        <article>
          <h3>账本分类清晰</h3>
          <p>可按策略或账户分别管理，数据边界明确，方便聚合查看。</p>
        </article>
        <article>
          <h3>盈亏自动聚合</h3>
          <p>市值、浮动盈亏、持仓占比自动汇总，减少手工统计。</p>
        </article>
        <article>
          <h3>持仓录入完整</h3>
          <p>支持市场、代码、成本、日期、备注等常用字段。</p>
        </article>
      </section>

      <section ref="previewSection" class="preview">
        <h3>界面预览</h3>
        <p>以下为核心页面布局示意。整体风格简洁大气，信息层级清楚，视觉不过度拥挤。</p>
        <div class="preview-grid">
          <div class="phone-card">
            <h4>首页总览</h4>
            <div class="mock-box">
              <div class="mock-line w-70"></div>
              <div class="mock-line w-40 red"></div>
              <div class="mock-tag-row">
                <span class="tag red">A股</span>
                <span class="tag blue">港股</span>
                <span class="tag green">美股</span>
              </div>
            </div>
          </div>
          <div class="phone-card">
            <h4>持仓列表</h4>
            <div class="mock-box">
              <div class="item" v-for="i in 3" :key="`holding-${i}`">
                <div class="mock-line w-30"></div>
                <div class="mock-line w-20 red"></div>
              </div>
            </div>
          </div>
          <div class="phone-card">
            <h4>添加持仓</h4>
            <div class="mock-box">
              <div class="input-row" v-for="i in 4" :key="`input-${i}`"></div>
              <div class="btn-row">
                <span></span>
                <span class="solid"></span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>

    <footer>
      <p>投资账本 © 2026 · 专注于清晰记录与汇总的个人投资管理</p>
    </footer>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const previewSection = ref(null)

function goToLogin() {
  router.push('/login')
}

function scrollToPreview() {
  previewSection.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<style scoped>
.about-page { background: #f4f2ee; min-height: 100vh; color: #1b1812; }
.about-header {
  position: sticky; top: 0; z-index: 5; backdrop-filter: blur(8px);
  background: rgba(244,242,238,.86); border-bottom: 1px solid #e4dfd5;
  padding: 16px 24px; display: flex; justify-content: space-between; align-items: center;
}
.brand { display: flex; gap: 12px; align-items: center; }
.brand h1 { margin: 0; font-size: 20px; }
.brand p { margin: 2px 0 0; color: #6f685b; font-size: 13px; }
.about-content { max-width: 1080px; margin: 0 auto; padding: 40px 24px 64px; }
.hero { display: grid; grid-template-columns: 1.1fr 1fr; gap: 28px; align-items: stretch; }
.pill { background: #e8e2d4; color: #7b6326; padding: 6px 12px; border-radius: 999px; font-size: 13px; }
.hero-copy h2 { margin: 16px 0 12px; font-size: 34px; line-height: 1.2; }
.hero-copy p { color: #4f4a41; line-height: 1.7; margin: 0; }
.hero-actions { margin-top: 24px; display: flex; gap: 12px; }
.primary-btn, .ghost-btn { border-radius: 10px; border: 1px solid transparent; padding: 10px 18px; cursor: pointer; font-weight: 600; }
.primary-btn { background: #14120e; color: #fff; }
.ghost-btn { background: #fff; border-color: #d8d2c7; color: #1b1812; }
.hero-panel { background: #fff; border-radius: 18px; padding: 20px; border: 1px solid #ece6dc; box-shadow: 0 10px 28px rgba(26,24,20,.08); }
.panel-top { display: flex; justify-content: space-between; color: #7e776a; font-size: 14px; }
.value-row { margin: 14px 0 16px; display: flex; gap: 12px; align-items: baseline; }
.value-row em { font-style: normal; font-size: 36px; font-weight: 700; }
.value-row b { color: #bb433b; font-size: 28px; }
.hero-panel ul { margin: 0; padding: 0; list-style: none; display: grid; gap: 10px; }
.hero-panel li { display: flex; justify-content: space-between; gap: 10px; font-size: 14px; border-top: 1px dashed #ece6db; padding-top: 8px; }
.capability { margin: 36px 0; display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
.capability article { background: #fff; border: 1px solid #ece6dc; border-radius: 14px; padding: 22px; }
.capability h3 { margin: 0 0 8px; font-size: 18px; }
.capability p { margin: 0; color: #595348; line-height: 1.6; }
.preview { margin-top: 44px; }
.preview h3 { margin: 0 0 8px; font-size: 24px; }
.preview p { margin: 0 0 20px; color: #6d665a; }
.preview-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
.phone-card { background: #fff; border: 1px solid #ece6dc; border-radius: 14px; padding: 18px; }
.phone-card h4 { margin: 0 0 12px; }
.mock-box { background: #f8f6f1; border-radius: 10px; padding: 12px; }
.mock-line { height: 10px; border-radius: 6px; background: #dad3c8; margin-bottom: 10px; }
.w-70 { width: 70%; } .w-40 { width: 40%; } .w-30 { width: 30%; } .w-20 { width: 20%; }
.red { background: #db857d; }
.mock-tag-row { display: flex; gap: 8px; }
.tag { font-size: 12px; border-radius: 6px; padding: 4px 8px; }
.tag.red { background: #fdeeed; color: #be4a43; }
.tag.blue { background: #e8f1fb; color: #1a74b8; }
.tag.green { background: #e7f6ee; color: #1f8a54; }
.item { display: flex; justify-content: space-between; margin-bottom: 12px; }
.input-row { height: 34px; border-radius: 8px; background: #ece8de; margin-bottom: 10px; }
.btn-row { display: flex; justify-content: flex-end; gap: 8px; }
.btn-row span { width: 66px; height: 30px; border-radius: 8px; background: #efeade; }
.btn-row .solid { background: #16130f; }
footer { border-top: 1px solid #e4dfd5; padding: 24px 16px; text-align: center; color: #6f685b; font-size: 13px; }

@media (max-width: 900px) {
  .hero { grid-template-columns: 1fr; }
  .capability, .preview-grid { grid-template-columns: 1fr; }
  .hero-copy h2 { font-size: 28px; }
  .about-header { padding: 14px 16px; }
  .brand p { display: none; }
}
</style>
