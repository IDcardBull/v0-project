// utils/api.js
// =====================================================
// 业务 API 集中管理，所有页面通过此模块调用后端
// =====================================================
const http = require('./request.js')
const {
  CHANNEL,
  channelParams,
  filterProductListResponse,
} = require('./channel.js')

// ---------- 鉴权 ----------
// 必须把 CHANNEL='wholesale' 传给后端，否则后端默认按零售（retail）凭证调
// jscode2session：用零售 AppSecret(wxadef2fa60a78ccaa) 校验批发 AppID
// (wx4614b3d303424458) 拿到的 code → 微信返 invalid code → 后端转抛 401。
const auth = {
  miniLogin: (code) => http.post('/client/auth/mini-login', { code, channel: CHANNEL }),
  phoneLogin: (phone, code) => http.post('/client/auth/phone-login', { phone, code, channel: CHANNEL }),
  bindPhone: (phone) => http.post('/client/auth/bind-phone', { phone }),
}

// ---------- 用户 ----------
const user = {
  profile: () => http.get('/client/user/profile'),
  updateProfile: (data) => http.patch('/client/user/profile', data),
}

// ---------- 商品 / 分类 ----------
const product = {
  categoriesTree: () => http.get('/client/categories/tree'),
  categories: () => http.get('/client/categories'),
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


// ---------- 移动端管理员（B2B 主理人工作台） ----------
// 直连 NestJS 后端 /admin/* 接口；request 会自动用 adminToken。
// dashboard / order list 都强制带 channel='wholesale'，让指标只反映批发渠道。
const adminAuth = 'admin'

const admin = {
  login: (username, password) =>
    http.post('/admin/auth/login', { username, password }, { auth: adminAuth, skipAuth: true }),
  profile: () => http.get('/admin/auth/profile', null, { auth: adminAuth, silent: true }),
  logout: () => http.post('/admin/auth/logout', null, { auth: adminAuth, silent: true }),

  dashboard: {
    overview: () =>
      http.get('/admin/dashboard/overview', { channel: CHANNEL }, { auth: adminAuth, silent: true }),
    salesTrend: (days) =>
      http.get('/admin/dashboard/sales-trend', { days, channel: CHANNEL }, { auth: adminAuth, silent: true }),
  },

  order: {
    list: (params) =>
      http.get('/admin/orders', { channel: CHANNEL, ...(params || {}) }, { auth: adminAuth }),
    counts: () => http.get('/admin/orders/status-counts', { channel: CHANNEL }, { auth: adminAuth, silent: true }),
    detail: (id) => http.get(`/admin/orders/${id}`, null, { auth: adminAuth }),
    logistics: (id) => http.get(`/admin/orders/${id}/logistics`, null, { auth: adminAuth, silent: true }).catch(() => null),
    ship: (id, payload) => http.patch(`/admin/orders/${id}/ship`, payload, { auth: adminAuth }),
    markPaid: (id) => http.patch(`/admin/orders/${id}/mark-paid`, null, { auth: adminAuth }),
    complete: (id) => http.patch(`/admin/orders/${id}/complete`, null, { auth: adminAuth }),
    close: (id, reason) => http.patch(`/admin/orders/${id}/close`, { reason: reason || '' }, { auth: adminAuth }),
    updateAmount: (id, totalAmount, reason) =>
      http.patch(`/admin/orders/${id}/amount`, { totalAmount: Number(totalAmount), reason: reason || '' }, { auth: adminAuth })
        .catch((err) => {
          // 后端 PR 合并前用 POST 兜底（同一 service.updateAmount，路由别名）
          if (err && /404|405/.test(String(err.message))) {
            return http.post(`/admin/orders/${id}/amount`, { totalAmount: Number(totalAmount), reason: reason || '' }, { auth: adminAuth })
          }
          throw err
        }),
  },

  product: {
    list: (params) =>
      http.get('/admin/products', { channel: 'all', ...(params || {}) }, { auth: adminAuth }),
    detail: (id) => http.get(`/admin/products/${id}`, null, { auth: adminAuth }),
    toggleListing: (id) => http.patch(`/admin/products/${id}/toggle-listing`, null, { auth: adminAuth }),
    toggleWholesale: (id) => http.patch(`/admin/products/${id}/toggle-wholesale`, null, { auth: adminAuth })
      .catch(() => http.patch(`/admin/products/${id}/toggle-retail`, null, { auth: adminAuth })),
  },

  sku: {
    listByProduct: (productId) => http.get(`/admin/sku/by-product/${productId}`, null, { auth: adminAuth }),
    updateStock: (id, stock) =>
      http.patch(`/admin/sku/${id}/stock`, { stock: Number(stock) }, { auth: adminAuth }),
  },
}

module.exports = { auth, user, product, address, order, pay, config, admin }
