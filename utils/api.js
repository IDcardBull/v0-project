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

// ---------- 订单（采购单提交后即订单） ----------
const order = {
  create: (data) => http.post('/client/orders', data),
  list: (params) => http.get('/client/orders', params),
  statusCounts: () => http.get('/client/orders/status-counts'),
  detail: (id) => http.get(`/client/orders/${id}`),
  cancel: (id) => http.patch(`/client/orders/${id}/cancel`),
  confirm: (id) => http.patch(`/client/orders/${id}/confirm`),
}

// ---------- 微信支付 ----------
const pay = {
  requestPayParams: (orderId) => http.post(`/client/pay/orders/${orderId}`),
}

module.exports = { auth, user, product, address, order, pay }
