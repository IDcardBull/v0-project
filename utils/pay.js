// utils/pay.js
// 开发期假支付开关：true = 不调微信支付，直接模拟支付成功。
const USE_FAKE_PAY = true
const FAKE_PAID_ORDER_KEY = 'fakePaidOrders'

function loadFakePaidOrders() {
  const list = wx.getStorageSync(FAKE_PAID_ORDER_KEY) || []
  return Array.isArray(list) ? list.map((v) => String(v)) : []
}

function saveFakePaidOrders(list) {
  wx.setStorageSync(FAKE_PAID_ORDER_KEY, Array.from(new Set((list || []).map((v) => String(v)))))
}

function markOrderFakePaid(orderId) {
  if (orderId == null || orderId === '') return
  const id = String(orderId)
  const list = loadFakePaidOrders()
  if (!list.includes(id)) {
    list.push(id)
    saveFakePaidOrders(list)
  }
}

function isOrderFakePaid(orderId) {
  if (orderId == null || orderId === '') return false
  return loadFakePaidOrders().includes(String(orderId))
}

function mapFakePaidStatus(status) {
  const s = status == null ? '' : String(status)
  if (s === 'pending' || s === 'pending_pay' || s === 'pendingPay' || s === 'unpaid') {
    return 'pending_ship'
  }
  return s
}

function getDisplayOrderStatus(order) {
  if (!order) return ''
  const id = order.id || order.orderId
  if (!USE_FAKE_PAY || !isOrderFakePaid(id)) return order.status
  return mapFakePaidStatus(order.status)
}

function fakePay(orderId) {
  return new Promise((resolve) => {
    markOrderFakePaid(orderId)
    wx.showToast({ title: '假支付成功', icon: 'success', duration: 800 })
    setTimeout(() => {
      resolve({ orderId, fake: true })
    }, 800)
  })
}

function requestPayment(params, orderId) {
  if (USE_FAKE_PAY) return fakePay(orderId)

  return new Promise((resolve, reject) => {
    wx.requestPayment({
      timeStamp: params.timeStamp,
      nonceStr: params.nonceStr,
      package: params.package,
      signType: params.signType || 'RSA',
      paySign: params.paySign,
      success: resolve,
      fail: reject,
    })
  })
}

module.exports = {
  USE_FAKE_PAY,
  requestPayment,
  markOrderFakePaid,
  isOrderFakePaid,
  getDisplayOrderStatus,
}
