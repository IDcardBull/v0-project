// utils/api.js
// =====================================================
// 业务 API 集中管理，所有页面通过此模块调用后端
// =====================================================
const http = require('./request.js')
const {
  channelParams,
  filterProductListResponse,
} = require('./channel.js')

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
  list: (params = {}) => http
    .get('/client/product/list', channelParams(params), { silent: true })
    .catch(() => http.get('/client/products', channelParams(params)))
    .then(filterProductListResponse),
  recommend: (limit = 8) => http.get('/client/products/recommend', channelParams({ limit })).then(filterProductListResponse),
  detail: (id) => http.get(`/client/products/${id}`, channelParams()),
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
  list: (params) => http
    .get('/client/orders', params, { silent: true })
    .catch(() => http.get('/client/order/list', params)),
  statusCounts: () => http
    .get('/client/orders/status-counts', null, { silent: true })
    .catch(() => http.get('/client/order/status-counts')),
  // 别名：页面里通常用 stats
  stats: () => order.statusCounts(),
  detail: (id) => http
    .get(`/client/orders/${id}`, null, { silent: true })
    .catch(() => http.get('/client/order/detail', { id })),
  cancel: (id) => http
    .patch(`/client/orders/${id}/cancel`, null, { silent: true })
    .catch(() => http.post('/client/order/cancel', { id })),
  confirm: (id) => http
    .patch(`/client/orders/${id}/confirm`, null, { silent: true })
    .catch(() => http.post('/client/order/confirm', { id })),
  // 更新订单收货地址（未发货可改）
  updateAddress: (id, addressId) => http
    .patch(`/client/orders/${id}/address`, { addressId }, { silent: true })
    .catch(() => http.post('/client/order/update-address', { id, addressId })),
  // 待付款订单重新调起支付
  repay: (id) => http
    .post(`/client/pay/orders/${id}`, null, { silent: true })
    .catch(() => http.post('/client/order/pay', { id })),
  logistics: (id) => http
    .get(`/client/orders/${id}/logistics`, null, { silent: true })
    .catch(() => http.get('/client/order/logistics', { orderId: id })),
}

// ---------- 微信支付 ----------
const pay = {
  requestPayParams: (orderId) => http.post(`/client/pay/orders/${orderId}`),
}

// ---------- 站点配置（客服电话 / 热门搜索 / 协议 URL 等） ----------
// 后端如果尚未实现该接口，会被 request 拦截器吞掉错误并返回 null，
// 前端各处会走默认值降级，保证功能不中断。
const config = {
  get: () => http.get('/client/config', null, { silent: true }).catch(() => null),
}

module.exports = { auth, user, product, address, order, pay, config }
