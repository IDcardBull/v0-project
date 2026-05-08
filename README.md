# 央茗陶瓷 · B2B 询价小程序（原生微信小程序）

> 原生微信小程序代码（WXML / WXSS / JS / JSON）。
> **业务定位**：陶瓷电子图册 + 客户下询价单 → 通过云函数推送企业微信群机器人 → 人工跟进处理。
> **数据架构**：商品 / 分类 / 地址 / 用户 仍走 NestJS（`/client/*`）；**订单全部走微信小程序云开发（cloudfunctions/）**。
> 已**移除微信支付**，订单提交后由客服人工对接价格、库存、物流。

---

## 一、运行前必做（重要）

### 1) 修改 NestJS API 域名

打开 `utils/request.js`：

```js
const BASE_URL = 'http://192.168.1.5:3001/api'  // ← 改成你的后端地址
```

商品/分类/品牌/地址/用户走这个后端。

### 2) 配置微信云开发环境

打开 `app.js`，把 `wx.cloud.init` 的 env 替换为你自己的云环境 ID：

```js
wx.cloud.init({
  env: 'your-cloud-env-id',  // ← 在云开发控制台获取
  traceUser: true,
})
```

### 3) 部署 6 个云函数

在微信开发者工具中右键 `cloudfunctions/` 下的每个目录 → **「上传并部署：云端安装依赖」**：

| 云函数 | 功能 |
| --- | --- |
| `submitOrder` | 创建订单 + 触发企业微信群机器人通知 |
| `listOrders` | 当前用户订单列表（按 status 过滤、分页） |
| `getOrder` | 当前用户订单详情 |
| `cancelOrder` | 取消订单（仅 `pending` 状态） |
| `confirmReceive` | 确认收货（仅 `shipping` 状态） |
| `getOrderStats` | 各状态订单数量（我的页用） |

### 4) 配置企业微信群机器人 Webhook

在云开发控制台 → 云函数 `submitOrder` → **「配置 → 环境变量」** 中新增：

```
WECOM_BOT_KEY = xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

> Webhook 完整地址形如 `https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=KEY`，仅填写最后的 `key=` 部分。
> **未配置时**：订单依然能正常入库，只是不会发群消息。

### 5) 在云数据库创建集合

云开发控制台 → 数据库 → 新建集合 `orders`，权限设置为 **「仅创建者及管理员可读写」**（云函数会用 OPENID 自动隔离用户数据）。

### 6) 配置 AppID + 导入项目

`project.config.json` 中 `appid` 改为你的小程序 AppID（云开发要求正式 AppID，不能用测试号）。
微信开发者工具 → 「+ 导入项目」→ 选择本目录。

### 7)（可选）站点配置接口

启动时调用 `GET /client/config` 拉取运行时配置：

```json
{
  "code": 0,
  "data": {
    "customerServicePhone": "400-188-8888",
    "hotKeywords": ["功夫茶具", "青花瓷", "酒店白瓷"],
    "agreementUrl": "https://yourdomain.com/agreement",
    "privacyUrl": "https://yourdomain.com/privacy",
    "about": "央茗陶瓷 · 景德镇源头工厂"
  }
}
```

后端未实现该接口时所有页面走默认值，不影响功能。

---

## 二、页面清单

| 页面 | 路径 | 说明 |
| --- | --- | --- |
| 批发大厅 | `pages/index/index` | 一级分类 Tab + 排序 + 商品列表（tab） |
| 分类 | `pages/category/category` | 左侧一级 + 右侧二级 + 商品（tab） |
| 采购单 | `pages/cart/cart` | 本地购物车（tab） |
| 我的 | `pages/profile/profile` | 用户信息 + 订单状态宫格（4 格）（tab） |
| 商品详情 | `pages/detail/detail` | 轮播、规格、阶梯价、加入采购单 / 立即购买 |
| 搜索 | `pages/search/search` | 热搜词、搜索历史 |
| 订单列表 | `pages/orders/orders` | 全部 / 待确认 / 待发货 / 已完成 / 已取消 |
| 订单详情 | `pages/order-detail/order-detail` | 订单明细、状态、取消 / 确认收货 |
| 结算 | `pages/checkout/checkout` | 选地址、备注、提交订单（无支付） |
| 收货地址 | `pages/address/address` | 列表、默认、Picker |
| 地址编辑 | `pages/address-edit/address-edit` | 新增 / 编辑 |
| 登录 | `pages/login/login` | 微信一键 + 手机号验证码 |

---

## 三、订单业务流

```
登录 ──► 浏览图册 ──► 详情（选规格 / 数量 / 阶梯价）
                          │
                ┌─────────┴────────┐
         加入采购单            立即购买
                │                  │
                └────► checkout ◄──┘
                       │
              提交订单（云函数 submitOrder）
                       │
              ┌────────┴────────┐
       写入云数据库 orders   调用企业微信机器人
                       │
              客服在群里收到订单 → 人工处理 → 在云控制台改 status
                       │
            shipping ──► completed（用户「确认收货」）
            或           cancelled（用户取消 / 客服取消）
```

- **采购单（购物车）** 本地存储（`utils/cart.js`），不走后端。
- **阶梯价** 选规格 / 调整数量时通过 `pickTierPrice()` 实时重算。
- **立即购买** 通过 `app.globalData.buyNowPayload` 临时载荷传递。
- **运费** 由客服核算后手动改云数据库中的 `shippingFee` 字段。

---

## 四、订单状态（仅 4 个）

| 状态 | 文案 | 切换方式 |
| --- | --- | --- |
| `pending`   | 待确认 | 用户提交订单后默认状态 |
| `shipping`  | 待发货 | 客服在云数据库手动改 |
| `completed` | 已完成 | 用户在 App 内点「确认收货」，或客服改 |
| `cancelled` | 已取消 | 用户在「待确认」时取消，或客服改 |

> 客服流程很简单：群里收到订单消息 → 联系客户确认 → 在云开发控制台 orders 集合中把 status 由 `pending` 改成 `shipping` 即可（同时可填 `trackingCompany` / `trackingNo` 字段，会展示在订单详情页）。

---

## 五、orders 集合数据结构

```js
{
  _id: '云数据库自动生成',
  _openid: 'OPENID（云函数自动注入）',
  orderNo: 'YM20260508xxxxxx',
  status: 'pending' | 'shipping' | 'completed' | 'cancelled',
  items: [
    { productId, skuId, name, spec, image, price, qty, lineTotal }
  ],
  totalQty: 12,
  goodsAmount: 1280.00,
  shippingFee: 0,        // 客服后台核算
  totalAmount: 1280.00,
  address: { contact, phone, province, city, district, detail },
  user: { nickname, phone },
  remark: '客户备注',
  notifySent: true,      // 是否已成功发企业微信
  notifiedAt: ISODate,
  createdAt: ISODate,
  updatedAt: ISODate,
  shippedAt: ISODate,    // 客服改为 shipping 时人工填
  completedAt: ISODate,  // 用户确认收货时自动填
  cancelledAt: ISODate,
  trackingCompany: '顺丰',  // 可选
  trackingNo: 'SF1234567890', // 可选
}
```

---

## 六、目录结构

```
.
├── app.js                        全局逻辑（登录态、tab 角标、云开发初始化、站点配置）
├── app.json                      页面注册 + tabBar
├── app.wxss                      全局样式 + 品牌色 token
├── sitemap.json
├── project.config.json           已配置 cloudfunctionRoot: "cloudfunctions/"
├── components/
│   ├── product-card/             列表商品卡片
│   └── quantity-stepper/         数量步进器
├── pages/                        12 个业务页面（无支付页）
├── cloudfunctions/               6 个云函数
│   ├── submitOrder/
│   ├── listOrders/
│   ├── getOrder/
│   ├── cancelOrder/
│   ├── confirmReceive/
│   └── getOrderStats/
└── utils/
    ├── request.js                HTTP 封装（NestJS 用）
    ├── api.js                    业务 API 聚合（订单走 cloud.js）
    ├── cloud.js                  云函数调用封装
    ├── cart.js                   本地购物车
    └── util.js                   formatPrice / formatTime / pickTierPrice / 状态映射
```

---

## 七、常见问题

**1. 提交订单时报"wx.cloud 不可用"？**
- 检查 `app.js` 的 `wx.cloud.init` env 是否填写。
- 基础库要求 2.2.3+。
- 必须使用正式 AppID，**云开发不支持测试号**。

**2. 群里没收到通知？**
- 云函数 `submitOrder` 的环境变量 `WECOM_BOT_KEY` 是否配置。
- 在云控制台 orders 集合查 `notifySent` 字段：`false` 说明发送失败，看云函数日志。

**3. 用户看不到自己的订单？**
- 云开发自动按 OPENID 隔离，确保用户已登录小程序（用户没登录 NestJS 也没关系，OPENID 由 wx.cloud 自动获取）。

**4. 客服如何修改订单状态？**
- 云开发控制台 → 数据库 → orders 集合 → 找到订单 → 点编辑 → 修改 status / shippingFee / trackingCompany / trackingNo 字段保存。
- 或者后续可加管理后台。

**5. 阶梯价如何生效？**
- `GET /client/products/:id` 在 SKU 内返回 `priceTiers: [{ minQty, maxQty, price }]`，前端会自动按当前数量命中。
