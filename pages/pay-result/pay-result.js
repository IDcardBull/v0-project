// pages/pay-result/pay-result.js
const api = require('../../utils/api.js')
const { formatPrice, toIdStr } = require('../../utils/util.js')

Page({
  data: {
    orderId: '',
    initialStatus: '',     // success | cancel
    fakePay: false,
    order: null,
    polling: true,
    retryCount: 0,
    maxRetry: 3,
  },

  onLoad(options) {
    const orderId = options.orderId
    const initialStatus = options.status || ''
    const fakePay = options.fake === '1'
    if (!orderId) {
      wx.showToast({ title: '订单不存在', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 800)
      return
    }
    this.setData({ orderId, initialStatus, fakePay })
    // 微信回调可能稍迟，延时 1.2s 再查
    setTimeout(() => this.fetchOrder(), 1200)
  },

  async fetchOrder() {
    try {
      const order = await api.order.detail(this.data.orderId)
      this.setData({ order })

      // 假支付只用于验证前端流程，后端订单状态可能仍是待支付。
      if (this.data.fakePay && this.data.initialStatus === 'success') {
        this.setData({ polling: false })
        return
      }

      // 如果用户支付成功但状态还是 pending_pay，等微信回调，再尝试 1-2 次
      if (
        this.data.initialStatus === 'success' &&
        order.status === 'pending_pay' &&
        this.data.retryCount < this.data.maxRetry
      ) {
        this.setData({ retryCount: this.data.retryCount + 1 })
        setTimeout(() => this.fetchOrder(), 2000)
        return
      }

      this.setData({ polling: false })
    } catch (e) {
      this.setData({ polling: false })
    }
  },

  retryPay() {
    if (!this.data.order) return
    wx.redirectTo({ url: `/pages/order-detail/order-detail?id=${this.data.orderId}` })
  },

  goOrders() {
    wx.switchTab({ url: '/pages/profile/profile' })
    setTimeout(() => {
      wx.navigateTo({ url: '/pages/orders/orders' })
    }, 200)
  },

  goOrderDetail() {
    wx.redirectTo({ url: `/pages/order-detail/order-detail?id=${this.data.orderId}` })
  },

  goHome() {
    wx.switchTab({ url: '/pages/index/index' })
  },
})
