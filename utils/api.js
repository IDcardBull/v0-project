// utils/api.js
// =====================================================
// 业务 API 集中管理，所有页面通过此模块调用后端
// =====================================================
const http = require('./request.js')

// ---------- 鉴权 ----------
const auth = {
  miniLogin: (code) => http.post('/client/auth/mini-login', { code }),
  phoneLogin: (phone, code) => http.post('/client/auth/phone-login', { phone, code }),
  bindPhone: (phone) => http.post('/client/auth/bind-phone', { phone }),
}

// ---------- 用户 ----------
const user = {
  profile: () => http.get('/client/user/profile'),
  updateProfile: (data) => http.patch('/client/user/profile', data),
}

// ---------- 商品 / 分类 / 品牌 ----------
const product = {
  categoriesTree: () => http.get('/client/categories/tree'),
  categories: () => http.get('/client/categories'),
  brands: () => http.get('/client/brands'),
  list: (params) => http.get('/client/products', params),
  recommend: (limit = 8) => http.get('/client/products/recommend', { limit }),
  detail: (id) => http.get(`/client/products/${id}`),
}

// ---------- 收货地址 ----------
const address = {
  list: () => http.get('/client/addresses'),
  detail: (id) => http.get(`/client/addresses/${id}`),
  create: (data) => http.post('/client/addresses', data),
  update: (id, data) => http.put(`/client/addresses/${id}`, data),
  setDefault: (id) => http.patch(`/client/addresses/${id}/default`),
  remove: (id) => http.del(`/client/addresses/${id}`),
}

// ---------- 订单（B2B 批发，走 NestJS /client/orders） ----------
// 状态枚举: pending_pay | pending_ship | shipped | completed | after_sale | closed
// 字段: id(BigInt) / orderNo / channel / status / totalAmount / freight / discountAmount /
//       paidAmount / addressId / receiverSnapshot / payMethod / paidAt / shippedAt /
//       completedAt / closedAt / logisticsCompany / trackingNo / remark / items[]
const order = {
  // items: [{ skuId, qty }]
  // 批发场景固定 channel='wholesale'、payMethod='offline'，下单即 pending_ship 状态由后端写入
  create: (data) =>
    http.post('/client/orders', {
      channel: 'wholesale',
      source: 'miniprogram_b',
      payMethod: 'offline',
      ...data,
    }),
  list: (params) => http.get('/client/orders', params),
  detail: (id) => http.get(`/client/orders/${id}`),
  statusCounts: () => http.get('/client/orders/status-counts'),
  // 兼容旧调用方
  stats: () => http.get('/client/orders/status-counts'),
  cancel: (id, reason) => http.patch(`/client/orders/${id}/cancel`, { reason }),
  confirm: (id) => http.patch(`/client/orders/${id}/confirm`),
  updateAddress: (id, addressId) =>
    http.patch(`/client/orders/${id}/address`, { addressId }),
  logistics: (id) => http.get(`/client/orders/${id}/logistics`),
}

// ---------- 站点配置（客服电话 / 热门搜索 / 协议 URL 等） ----------
// 后端如果尚未实现该接口，会被 request 拦截器吞掉错误并返回 null，
// 前端各处会走默认值降级，保证功能不中断。
const config = {
  get: () => http.get('/client/config', null, { silent: true }).catch(() => null),
}

module.exports = { auth, user, product, address, order, config }
