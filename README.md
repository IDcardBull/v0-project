# 央茗陶瓷 · B2B 批发小程序（前端）

景德镇陶瓷批发场景的微信小程序前端，与管理端 [`v0-vue-element-plus`](https://github.com/IDcardBull/v0-vue-element-plus) 共用同一个 NestJS 后端。

> **数据架构**：所有业务数据（商品 / 分类 / 品牌 / 地址 / 用户 / 订单）全部通过后端 `/client/*` REST 接口对接 NestJS + MySQL，**前端不存任何业务数据**。
> 企业微信群机器人通知由后端 hook 触发，前端不参与。

---

## 1) 后端联调地址

后端 NestJS 默认监听 `0.0.0.0:3000`。本地联调有两种方式：

| 场景 | API_BASE_URL |
| --- | --- |
| 本地 + 真机 | 局域网 IP，如 `http://192.168.1.10:3000` |
| 本地 + 模拟器 | `http://127.0.0.1:3000` |
| 已上线 | `https://api.yourdomain.com` |

修改 `utils/request.js` 顶部的 `API_BASE_URL` 即可。微信小程序需要在「开发」→「服务器域名」白名单加入域名；本地调试请勾选开发者工具 →「详情」→「不校验合法域名」。

---

## 2) 接口字段对接清单

### 鉴权（`/client/auth/*`，公开）
- `POST /client/auth/mini-login` `{ code }` → 返回 `{ token, user }`
- `POST /client/auth/wechat-login` 同上（别名）
- `POST /client/auth/phone-login` `{ phone, code }`
- `POST /client/auth/bind-phone` `{ phone }`（需登录）

返回的 `token` 写入 `Authorization: Bearer xxx`，由 `utils/request.js` 自动注入。

### 用户（`/client/user/*`）
- `GET /client/user/profile` → `{ id, nickname, avatar, phone, gender, role, level: { id, name }, points, balance, totalSpent, registeredAt }`
- `PATCH /client/user/profile` `{ nickname?, avatar?, gender? }`

### 商品 / 分类（`/client/*`，公开）
- `GET /client/categories/tree` → 树形 `[{ id, name, icon, parentId, children, productCount }]`
- `GET /client/brands` → `[{ id, name, logo }]`
- `GET /client/products` 参数 `{ categoryId?, brandId?, keyword?, channel?, sort?, page?, pageSize? }`
- `GET /client/products/recommend?limit=8`
- `GET /client/products/:id` → 含 `skus`（含 `priceTiers`）、`category`、`brand`

商品关键字段：`mainImage / images[] / retailPrice / memberPrice / minWholesaleQty / wholesaleEnabled / salesCount`

SKU 关键字段：`id / specs(JSON) / image / retailPrice / memberPrice / stock / priceTiers[]`

### 收货地址（`/client/addresses/*`）
- `GET /client/addresses` → `[{ id, receiver, phone, province, city, district, detail, isDefault, tag }]`
- `POST /client/addresses`、`PUT /client/addresses/:id`、`DELETE /client/addresses/:id`
- `PATCH /client/addresses/:id/default`

### 订单（`/client/orders/*`）

#### 状态机（与后端枚举完全一致）

| 后端 status | 前端文案 | 何时进入 |
| --- | --- | --- |
| `pending_pay` | 待确认 | 下单初始状态（即使是 `payMethod='offline'` 也会进入此状态，由客服联系后流转） |
| `pending_ship` | 待发货 | 客服在管理端确认 / 已支付 |
| `shipped` | 待收货 | 客服在管理端发货并填写物流单号 |
| `completed` | 已完成 | 用户在小程序「确认收货」 |
| `after_sale` | 售后中 | 后端 `OrderService.refund()` |
| `closed` | 已关闭 | 用户取消 / 系统超时关闭 |

#### 接口

- `POST /client/orders` `{ items: [{skuId, qty}], addressId, remark?, channel='wholesale', source='miniprogram_b', payMethod='offline' }`
  - 前端 `utils/api.js` 中 `order.create()` 已固定 `channel/source/payMethod` 默认值，业务代码只传 `items + addressId + remark`
  - 后端会按 `skuId+qty` 重新查表计算金额、写入 `order_items` 快照、占用库存、最后返回完整订单
- `GET /client/orders?status=pending_pay&page=1&pageSize=10`
- `GET /client/orders/status-counts` → `{ all, pending_pay, pending_ship, shipped, completed, after_sale, closed }`
- `GET /client/orders/:id`
- `PATCH /client/orders/:id/cancel` `{ reason? }`（用户取消，仅 pending_pay/pending_ship 可用）
- `PATCH /client/orders/:id/confirm`（用户确认收货，仅 shipped 可用）
- `PATCH /client/orders/:id/address` `{ addressId }`
- `GET /client/orders/:id/logistics`

#### 订单字段对接

| 后端字段 | 前端用法 | 备注 |
| --- | --- | --- |
| `id` | `BigInt`，前端转 `String(id)` 用 | 路由参数也按字符串传 |
| `orderNo` | 订单号展示用 | 客服查询时使用 |
| `totalAmount` | 订单合计 | 已含运费、减优惠 |
| `freight` | 运费 | 0 时前端展示「客服核算」 |
| `discountAmount` | 优惠 | 大于 0 时显示 |
| `paidAmount` | 已支付 | 详情可展示 |
| `payMethod` | `wechat / offline / credit` | 详情页文案转换 |
| `paidAt / shippedAt / completedAt / closedAt` | 时间线 | 详情页按存在性显示 |
| `logisticsCompany / trackingNo` | 物流 | 已发货时展示 |
| `address` 关联表 | 当前关联地址 | 用户改了地址会跟着变 |
| `receiverSnapshot` | 下单时地址快照 | 即使原地址被删除/修改也保留 |
| `items[].productName / skuSpec / skuImage / unitPrice / qty / subtotal` | 订单内商品 | 注意 `skuSpec` 是 JSON 字符串，详情页通过 `formatSpec()` 解析 |

---

## 3) 企业微信群机器人通知（由后端实现）

> **前端不参与，无需任何配置。**

后端在 `OrderService.createOrder()` 完成后增加一个 hook：用 `axios.post(WECOM_BOT_URL, { msgtype: 'markdown', markdown: { content: '...订单详情...' } })`。
机器人 Webhook 地址通过环境变量 `WECOM_BOT_KEY` 注入，未配置时 hook 静默 `try/catch` 跳过。

由后端同事在 NestJS 项目里加 `OrderNotifyService`，前端无需任何改动即可享受到群消息通知。

---

## 4) 站点配置接口（可选）

启动时调用 `GET /client/config`（公开），返回结构：

```json
{
  "customerServicePhone": "400-188-8888",
  "hotKeywords": ["功夫茶具", "青花瓷", "酒店白瓷"],
  "agreementUrl": "https://yourdomain.com/agreement",
  "privacyUrl": "https://yourdomain.com/privacy",
  "freeShippingThreshold": 1000,
  "flatShippingFee": 20,
  "about": "央茗陶瓷 · 景德镇源头工厂"
}
```

接口未实现时所有相关 UI 走默认值降级，不会报错。

---

## 5) 页面清单

| 页面 | 路径 | 说明 |
| --- | --- | --- |
| 批发大厅 | `pages/index/index` | 一级分类 Tab + 排序 + 商品列表（tab） |
| 分类 | `pages/category/category` | 左侧一级 + 右侧二级 + 商品（tab） |
| 采购单 | `pages/cart/cart` | 本地购物车（tab） |
| 我的 | `pages/profile/profile` | 用户信息 + 订单状态宫格（4 格）（tab） |
| 商品详情 | `pages/detail/detail` | 轮播、规格、阶梯价、加入采购单 / 立即购买 |
| 搜索 | `pages/search/search` | 热搜词、搜索历史 |
| 订单列表 | `pages/orders/orders` | 全部 / 待确认 / 待发货 / 待收货 / 已完成 |
| 订单详情 | `pages/order-detail/order-detail` | 订单明细、状态、取消 / 确认收货 |
| 结算 | `pages/checkout/checkout` | 选地址、备注、提交订单（无支付） |
| 收货地址 | `pages/address/address` | 列表、默认、Picker |
| 地址编辑 | `pages/address-edit/address-edit` | 新增 / 编辑 |
| 登录 | `pages/login/login` | 微信一键 + 手机号验证码 |

---

## 6) 项目结构

```
.
├── app.js                         全局初始化（鉴权 / tabBar 角标 / 站点配置）
├── app.json                       页面路由 + tabBar
├── project.config.json            微信开发者工具配置
├── utils/
│   ├── request.js                 HTTP 封装（401 自动跳登录、统一错误 toast）
│   ├── api.js                     业务接口集合
│   ├── cart.js                    采购单（购物车）本地存储 + 阶梯价计算
│   └── util.js                    格式化、订单状态映射等
├── pages/                         12 个业务页面（无支付页）
└── images/                        本地资源（tabBar 图标等）
```

---

## 7) 启动小程序

1. 安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html) 稳定版
2. 「+ 导入项目」→ 选择项目根目录（含 `app.json`）
3. 修改 `utils/request.js` 中的 `API_BASE_URL`
4. 详情中如果是测试号 / tourist appid，将「不校验合法域名」勾选

---

## 8) 常见问题

**1. 提交订单 400 「商品不能为空」？**
检查 checkout 页传给后端的 `items` 是否包含 `skuId`，前端会 `Number(skuId)` 转换；`skuId` 必须是数字。

**2. 401 反复跳登录？**
- JWT 过期：`utils/request.js` 在 401 时会自动 `app.logout() + 跳登录`
- 请检查后端 `JwtStrategy` 的 `secret` 与前端登录返回的 token 是否一致

**3. 商品列表为空？**
- 后端 `Product.status = 1`（上架）才会返回
- `wholesaleEnabled` 与 `retailEnabled`：默认 `channel='retail'`，B2B 端传 `channel='wholesale'`
- 前端 `api.product.list(params)` 默认零售，订单提交时已强制 `channel='wholesale'`

**4. 订单 `id` 是 BigInt，wxml 里显示 `[object Object]`？**
- 前端 format 时已统一 `String(o.id)` 转字符串
- 路由参数也按字符串传：`?id=${order.id}`

**5. 物流没显示？**
- 后端发货后会写入 `logisticsCompany / trackingNo / shippedAt`
- 详情页根据 `shippedAtText` 是否存在条件渲染

**6. 订单 hook 没发企业微信群？**
- 这是后端的事；让后端同事去 `OrderService.createOrder()` 完成后加个 `axios.post(WECOM_BOT_URL, ...)` hook
- 检查后端环境变量 `WECOM_BOT_KEY` 是否配置
