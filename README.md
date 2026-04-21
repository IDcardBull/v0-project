# 央茗陶瓷 · B2B 批发小程序（原生微信小程序）

> 原生微信小程序代码（WXML / WXSS / JS / JSON），**不是** Web 版。
> 使用「微信开发者工具」直接打开本目录即可运行，无需 npm / node_modules。

---

## 一、如何运行

1. 下载并安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)（稳定版）。
2. 打开工具 → 选择「小程序」→ 点击「+ 导入项目」。
3. 目录选择：本项目的根目录（即包含 `app.json` 的那一层）。
4. AppID：
   - 如果您有自己的小程序 AppID，填入即可。
   - 如果只是本地体验，选择「测试号」或「不使用云服务 · 使用测试号」均可。
5. 点击「导入」即自动编译运行。

> 本项目已包含 `project.config.json` 和 `project.private.config.json`，导入后会自动识别配置。

---

## 二、页面清单（共 10 个页面）

| 页面 | 路径 | 说明 |
| --- | --- | --- |
| 批发大厅（首页） | `pages/index/index` | 顶部搜索、分类导航、推荐商品流、tab |
| 分类 | `pages/category/category` | 左侧一级分类 + 右侧二级商品网格，tab |
| 采购单 | `pages/cart/cart` | 购物车（支持批量选择、修改数量、删除），tab |
| 我的 | `pages/profile/profile` | 会员信息、订单入口、功能宫格，tab |
| 商品详情 | `pages/detail/detail` | 轮播图、阶梯价表、起批量、加入采购单 |
| 搜索 | `pages/search/search` | 热门关键词、搜索历史、实时搜索结果 |
| 订单列表 | `pages/orders/orders` | 按状态（全部/待确认/待付款/待发货/已完成）筛选 |
| 订单详情 | `pages/order-detail/order-detail` | 订单明细 + 物流状态 + 金额结算 |
| 登录 | `pages/login/login` | 手机号 + 验证码，支持微信一键登录 |
| 收货地址 | `pages/address/address` | 地址列表、默认地址、选择地址模式 |

---

## 三、目录结构

```
.
├── app.js                 // 全局逻辑
├── app.json               // 页面注册 + tabBar
├── app.wxss               // 全局样式 + 设计 token（青灰品牌色 / 深红价格色）
├── sitemap.json
├── project.config.json
├── project.private.config.json
├── components/
│   ├── product-card/        // 商品卡片（支持加入采购单、数量步进）
│   └── quantity-stepper/    // 通用数量加减步进器
├── pages/
│   ├── index/ category/ cart/ profile/
│   ├── detail/ search/ orders/ order-detail/
│   └── login/ address/
├── utils/
│   ├── products.js          // 模拟商品数据 + 阶梯价
│   ├── orders.js            // 模拟订单数据
│   └── util.js              // 通用工具函数（格式化金额等）
└── images/
    ├── products/            // 商品图（AI 生成，真实陶瓷素材）
    └── tabbar/              // 底部 tab 图标
```

---

## 四、核心业务特性

1. **B2B 批发专属设计**：所有商品都配置 *起批量* + *4 档阶梯价*（如 12-49 / 50-199 / 200-499 / ≥500），数量越大单价越低。
2. **采购单模式**：购物车命名为「采购单」，结算按钮为「生成询价单」，更贴合批发场景。
3. **询价流程**：生成询价单后跳到 `order-detail` 页，后续业务员可对接确价 → 打款 → 发货。
4. **本地持久化**：当前版本采用 `wx.getStorageSync / setStorageSync` 本地模拟购物车、地址、订单等。
5. **视觉规范**：
   - 主色：青灰 `#3c5a6f`（品牌专业感）
   - 价格色：商务深红 `#b94a3c`
   - 次要辅助色：浅灰分隔线、柔和背景
   - 严格控制在 5 色以内，无花哨渐变

---

## 五、对接真实后端

模拟数据集中在：

- `utils/products.js` → 替换 `getProducts / getProductById` 为 `wx.request`
- `utils/orders.js` → 替换 `getOrders / getOrderById` 为 `wx.request`
- `pages/login/login.js` → 替换 `sendCode` 和 `onLogin` 的 mock 逻辑为真实 API

建议在 `app.js` 中维护全局 `baseURL`，并将请求封装到 `utils/request.js`。

---

## 六、常见问题

- **打开后 tabBar 图标是白底？**
  因为当前用 JPG 占位图；正式发版建议替换为 81×81 的透明 PNG。
- **为什么没有 `node_modules`？**
  原生小程序无需 npm 依赖。如果您要用 npm 包，请在开发者工具中点击「工具 → 构建 npm」。
- **AppID 必须填吗？**
  本地预览可不填（使用测试号）；要真机预览与发布才必须填企业或个人 AppID。
