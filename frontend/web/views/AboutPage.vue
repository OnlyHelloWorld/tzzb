<template>
  <div class="about-page">
    <header class="about-header">
      <h1>投资账本</h1>
      <p>一个用于记录持仓、管理账本和查看汇总数据的网页应用。</p>
    </header>

    <main class="about-content">
      <section>
        <h2>项目主要功能</h2>
        <ul>
          <li>登录后使用账本功能，未登录可查看本说明页。</li>
          <li>支持创建、编辑、删除、排序多个账本，并可切换卡片/列表视图查看账本。</li>
          <li>支持按账本维护持仓，包含新增、编辑、删除、重置成本等操作。</li>
          <li>持仓支持 A股、港股、美股，可按市场查看持仓与汇总。</li>
          <li>支持查看总市值、盈亏、持仓占比等汇总数据，并支持按币种换算为人民币展示。</li>
          <li>支持导入导出：单账本或多账本 CSV，及账本报告 PDF 导出。</li>
        </ul>
      </section>

      <section>
        <h2>主要页面</h2>
        <ul>
          <li>登录页：账号登录与会话校验。</li>
          <li>首页：展示所有账本汇总、账本列表与导入导出入口。</li>
          <li>账本页：管理单个账本内的持仓与交易记录。</li>
          <li>所有账本详情页：查看跨账本的详细汇总数据。</li>
        </ul>
      </section>

      <section>
        <h2>说明</h2>
        <p>
          本页仅根据当前代码中已实现的界面与功能进行描述，不包含未实现能力。
        </p>
      </section>
    </main>
  </div>
</template>

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

section {
  background: #fff;
  border: 1px solid #e7e1d7;
  border-radius: 12px;
  padding: 18px;
  margin-bottom: 16px;
}

h2 {
  margin: 0 0 10px;
  font-size: 20px;
}

ul {
  margin: 0;
  padding-left: 20px;
  line-height: 1.8;
}

p {
  margin: 0;
  line-height: 1.8;
}
</style>
