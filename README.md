# 央茗陶瓷 · B2B 批发小程序（原生微信小程序）

> 原生微信小程序代码（WXML / WXSS / JS / JSON），**已对接真实后端 API（NestJS）**。
> 使用「微信开发者工具」直接打开本目录即可运行。

---

## 一、运行前必做（重要）

### 1) 修改 API 域名

打开 `utils/request.js` 第 9 行：

```js
const BASE_URL = 'http://192.168.1.5:3001/api'  // ← 改成你的后端地址
```

- 本地联调：改为电脑内网 IP（手机要能访问），微信开发者工具勾选 **「不校验合法域名 / TLS 证书」**。
- 生产环境：改成 HTTPS 域名（例如 `https://api.yourdomain.com/api`），并在小程序后台「服务器域名」中配置 `request 合法域名`。

### 2) 配置 AppID

打开 `project.config.json`，将 `appid` 改成自己的小程序 AppID（本地体验也可用「测试号」）。

### 3) 导入项目

1. 安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html) 稳定版。
2. 「+ 导入项目」→ 选择本项目根目录（含 `app.json` 的那一层）→ 导入。

### 4)（可选）站点配置接口

小程序启动时会调用 `GET /client/config`（无需登录）拉一份运行时配置，缓存到 `globalData.siteConfig` + storage。
**后端如果未实现该接口，会被静默跳过，所有页面走默认值降级，功能不会中断。**

期望返回结构（任意字段都可缺省）：

```json
{
  "code": 0,
  "data": {
    "customerServicePhone": "400-188-8888",
    "customerServiceWechat": "yangming-cs",
    "hotKeywords": ["功夫茶具", "青花瓷", "酒店白瓷"],
    "agreementUrl": "https://yourdomain.com/agreement",
    "privacyUrl": "https://yourdomain.com/privacy",
    "freeShippingThreshold": 1000,
    "flatShippingFee": 20,
    "about": "央茗陶瓷 · 景德镇源头工厂"
  }
}
```

| 字段 | 影响位置 | 不配置时行为 |
| --- | --- | --- |
| `customerServicePhone` | 我的、商品详情、订单详情的「联系客服」 | 提示「客服电话暂未配置」 |
| `hotKeywords` | 搜索页热搜词 | 用一级分类名前 8 项作为降级 |
| `agreementUrl` / `privacyUrl` | 登录页 + 我的 → 协议链接 | 弹本地 modal 文本 |
| `freeShippingThreshold` / `flatShippingFee` | 结算页运费 | 全场包邮（0 元运费）|
| `about` | 我的 → 关于我们 | 默认品牌名 + 当前版本 |

---

## 二、页面清单（共 12 个页面）

| 页面 | 路径 | 说明 |
| --- | --- | --- |
| 批发大厅 | `pages/index/index` | 一级分类 Tab + 综合/销量/价格排序 + 商品列表（tab） |
| 分类 | `pages/category/category` | 左侧一级类目 + 右侧二级 + 商品（tab） |
| 采购单 | `pages/cart/cart` | 本地购物车，支持多选、改量、删除（tab） |
| 我的 | `pages/profile/profile` | 用户信息 + 订单状态宫格 + 服务菜单（tab） |
| 商品详情 | `pages/detail/detail` | 轮播图、规格、阶梯价表、起批量、加入采购单 / 立即购买 |
| 搜索 | `pages/search/search` | 热门关键词、搜索历史、关键词列表 |
| 订单列表 | `pages/orders/orders` | 全部 / 待付款 / 待发货 / 待收货 / 已完成 |
| 订单详情 | `pages/order-detail/order-detail` | 订单明细、状态、再支付 / 取消 / 确认收货 |
| 结算 | `pages/checkout/checkout` | 选地址、备注、确认下单、调起微信支付 |
| 支付结果 | `pages/pay-result/pay-result` | 支付成功 / 取消提示，跳订单详情 |
| 收货地址 | `pages/address/address` | 列表、默认、Picker 模式（结算选地址） |
| 地址编辑 | `pages/address-edit/address-edit` | 新增 / 编辑收货地址 |
| 登录 | `pages/login/login` | 微信一键登录 + 手机号验证码登录 |

---

## 三、对接的后端接口

均按照对接文档调用 `/client/*` 接口（响应信封 `{ code, data, message }`，401 自动跳登录）。

### 鉴权
- `POST /client/auth/mini-login`     微信小程序一键登录
- `POST /client/auth/phone-login`    手机号 + 验证码（开发期固定 `123456`）

### 用户
- `GET  /client/user/profile`        当前用户

### 商品 / 分类 / 品牌
- `GET  /client/categories/tree`     树形分类
- `GET  /client/categories`          扁平分类
- `GET  /client/brands`              品牌
- `GET  /client/products`            商品列表（支持 categoryId / keyword / sort / page / pageSize）
- `GET  /client/products/recommend`  推荐
- `GET  /client/products/:id`        商品详情（含 SKU、阶梯价、minWholesaleQty）

### 收货地址
- `GET  /client/addresses`
- `GET  /client/addresses/:id`
- `POST /client/addresses`
- `PUT  /client/addresses/:id`
- `PATCH /client/addresses/:id/default`
- `DELETE /client/addresses/:id`

### 订单
- `POST  /client/orders`             下单（items + addressId + remark）
- `GET   /client/orders`             列表（status / page / pageSize）
- `GET   /client/orders/status-counts` 各状态数量（profile 页用）
- `GET   /client/orders/:id`         详情
- `PATCH /client/orders/:id/cancel`
- `PATCH /client/orders/:id/confirm`

### 微信支付
- `POST /client/pay/orders/:orderId` 返回 wx.requestPayment 所需 5 字段

---

## 四、关键业务流

```
登录 ──► 浏览商品 ──► 详情（选规格 / 数量 / 命中阶梯价）
                          │
                ┌─────────┴────────┐
                │                  │
         加入采购单            立即购买
                │                  │
                └────► checkout ◄──┘
                       │
                  调 /orders 创建订单
                       │
                调 /pay/orders/:id 拿支付参数
                       │
                  wx.requestPayment
                       │
                  pay-result ─► 订单详情
```

- **采购单（购物车）** 完全本地存储（`utils/cart.js`），不走后端，避免每次进入都拉取。
- **阶梯价** 选规格或调整数量时，实时通过 `pickTierPrice()` 重算，命中规则是 `qty ∈ [minQty, maxQty]`。
- **立即购买** 通过 `app.globalData.buyNowPayload` 临时载荷传递，不污染购物车。
- **下单后** 立即从购物车移除已下单的 SKU，并刷新 tabBar 角标。

---

## 五、目录结构

```
.
├── app.js                       全局逻辑（登录态、tab 角标）
├── app.json                     页面注册 + tabBar
├── app.wxss                     全局样式 + 品牌色 token
├── sitemap.json
├── project.config.json
├── project.private.config.json
├── components/
│   ├── product-card/            列表商品卡片
│   └── quantity-stepper/        数量步进器
├── pages/                       12 个业务页面
└── utils/
    ├── request.js               HTTP 封装（401 自动跳登录、错误 Toast）
    ├── api.js                   所有业务 API 集中导出
    ├── cart.js                  本地购物车（CRUD + 阶梯价重算）
    ├── util.js                  formatPrice / formatTime / pickTierPrice / 状态映射
    └── (无 mock 数据，已对接真实后端)
```

---

## 六、订单状态枚举

`utils/util.js` 已支持以下后端枚举（可与后端任选一套，无需改前端）：

| 状态值 | 文案 | 颜色 |
| --- | --- | --- |
| `pending` / `pending_pay` | 待付款 | 红 |
| `paid` / `pending_ship` | 待发货 | 青灰 |
| `shipped` | 待收货 | 青灰 |
| `completed` | 已完成 | 灰 |
| `cancelled` / `closed` | 已取消 | 灰 |
| `refunding` / `after_sale` | 退款中 | 红 |

---

## 七、常见问题

**1. 接口都报"网络错误，请检查连接"？**
- 检查 `utils/request.js` 的 `BASE_URL` 是否填写正确。
- 微信开发者工具：右上角「详情 → 本地设置 → 不校验合法域名」勾选。
- 真机预览：需要 HTTPS 域名 + 小程序后台配置 request 合法域名。

**2. 401 跳转登录后回不来？**
- 由 `request.js` 自动跳 `pages/login/login`，登录成功后会 `wx.navigateBack` 回到原页面。

**3. 微信支付调起失败？**
- 后端必须返回 `timeStamp / nonceStr / package / signType / paySign` 五字段。
- 小程序 AppID、商户号、支付证书必须配置正确。

**4. 阶梯价没有生效？**
- `GET /client/products/:id` 必须在 SKU 内返回 `priceTiers: [{ minQty, maxQty, price }]`，详情页和购物车会自动按当前数量命中。

**5. tabBar 图标白底太突兀？**
- 当前是 AI 生成的 JPG 占位图，正式发版请用 81×81 透明 PNG 替换 `images/tabbar/`。
