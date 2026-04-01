此次合并主要涉及后端数据库模型重构和前端应用界面重写，实现了从本地存储到服务器存储的转变，并添加了用户认证功能。后端数据库模型采用联合主键设计，前端界面采用现代化的响应式设计，支持持仓管理、交易记录管理和多格式导出功能。
| 文件 | 变更 |
|------|---------|
| backend/.python-version | - 新增文件，设置Python版本为3.12.13 |
| backend/app/api/holdings.py | - 调整持仓排序方式为按市场和代码排序<br>- 为Trade模型添加user_id、market、code字段<br>- 修改批量保存持仓逻辑，支持更新现有持仓<br>- 修改删除持仓API，使用market和code作为路径参数<br>- 在各个操作中添加db.commit()确保数据持久化 |
| backend/app/api/settings.py | - 将db.flush()改为db.commit()确保设置变更持久化 |
| backend/app/core/config.py | - 固定使用SQLite数据库<br>- JWT过期时间改为10年（永久有效）<br>- 扩展CORS origins支持更多本地端口<br>- 加载.env文件配置 |
| backend/app/core/database.py | - 根据数据库类型设置不同的引擎参数，SQLite使用简化配置 |
| backend/app/core/email_service.py | - 添加模拟模式，总是显示验证码，方便无网络环境测试 |
| backend/app/core/models.py | - 为Holding模型设置联合主键(user_id, market, code)<br>- 为Trade模型添加user_id, market, code字段<br>- 建立Trade到Holding的外键关联 |
| backend/app/core/security.py | - 密码哈希算法从bcrypt改为pbkdf2_sha256<br>- 移除JWT过期时间验证，实现永久有效令牌 |
| backend/requirements.txt | - 调整依赖版本，添加pydantic-settings |
| frontend/index.html | - 新增文件，设置应用入口，配置元数据和标题 |
| frontend/vite.config.js | - 新增文件，配置Vite开发服务器，设置API代理 |
| frontend/web/App.vue | - 重构前端界面，添加登录功能<br>- 实现持仓管理、交易记录管理<br>- 添加导入导出功能<br>- 优化UI界面，采用响应式设计 |
| frontend/web/lib/api.js | - 新增文件，实现与后端API的交互，包括认证、持仓管理和设置管理 |
| frontend/web/lib/io.js | - 新增文件，实现JSON/CSV/PDF三种格式的导入导出功能 |