// pages/order-detail/order-detail.js
const api = require('../../utils/api.js')
const { formatPrice, statusText, statusColor, formatTime } = require('../../utils/util.js')
const app = getApp()

Page({
  data: {
    orderId: '',
    order: null,
    loading: true,
  },

  onLoad(options = {}) {
    if (!options.id) {
      wx.showToast({ title: '参数错误', icon: 'none' })
      return
    }
    this.setData({ orderId: options.id })
    this.loadOrder()
  },

  onPullDownRefresh() {
    this.loadOrder().finally(() => wx.stopPullDownRefresh())
  },

  async loadOrder() {
    this.setData({ loading: true })
    try {
      const order = await api.order.detail(this.data.orderId)
      const items = (order.items || []).map((it) => ({
        ...it,
        priceText: formatPrice(it.price),
        lineTotalText: formatPrice((Number(it.price) || 0) * (Number(it.qty) || 0)),
      }))
      const totalQty = items.reduce((s, i) => s + (Number(i.qty) || 0), 0)
      this.setData({
        order: {
          ...order,
          items,
          totalQty,
          statusText: statusText(order.status),
          statusColor: statusColor(order.status),
          totalAmountText: formatPrice(order.totalAmount),
          goodsAmountText: formatPrice(order.goodsAmount || order.totalAmount),
          shippingFeeText: order.shippingFee ? formatPrice(order.shippingFee) : '0.00',
          createdAtText: formatTime(order.createdAt),
          paidAtText: order.paidAt ? formatTime(order.paidAt) : '',
        },
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 复制订单号
  copyOrderNo() {
    const no = (this.data.order && (this.data.order.orderNo || this.data.order.id)) || ''
    wx.setClipboardData({ data: no })
  },

  // 立即付款
  async payNow() {
    try {
      wx.showLoading({ title: '调起支付', mask: true })
      const params = await api.order.repay(this.data.orderId)
      wx.hideLoading()
      await wx.requestPayment({
        timeStamp: params.timeStamp,
        nonceStr: params.nonceStr,
        package: params.package,
        signType: params.signType || 'RSA',
        paySign: params.paySign,
      })
      wx.redirectTo({ url: `/pages/pay-result/pay-result?status=success&orderId=${this.data.orderId}` })
    } catch (err) {
      wx.hideLoading()
      if (err && err.errMsg && err.errMsg.includes('cancel')) {
        wx.showToast({ title: '已取消支付', icon: 'none' })
      }
    }
  },

  // 取消订单
  async cancelOrder() {
    const { confirm } = await wx.showModal({ title: '提示', content: '确认取消该订单？取消后不可恢复。' })
    if (!confirm) return
    await api.order.cancel(this.data.orderId)
    wx.showToast({ title: '已取消', icon: 'success' })
    this.loadOrder()
  },

  // 确认收货
  async confirmReceive() {
    const { confirm } = await wx.showModal({ title: '提示', content: '确认已收到货？' })
    if (!confirm) return
    await api.order.confirm(this.data.orderId)
    wx.showToast({ title: '已确认', icon: 'success' })
    this.loadOrder()
  },

  callService() {
    app.callCustomerService()
  },
})
