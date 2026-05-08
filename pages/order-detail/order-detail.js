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
          id: order.id || order._id,
          items,
          totalQty,
          statusText: statusText(order.status),
          statusColor: statusColor(order.status),
          totalAmountText: formatPrice(order.totalAmount),
          goodsAmountText: formatPrice(order.goodsAmount || order.totalAmount),
          shippingFeeText: order.shippingFee ? formatPrice(order.shippingFee) : '0.00',
          createdAtText: formatTime(order.createdAt),
          shippedAtText: order.shippedAt ? formatTime(order.shippedAt) : '',
          completedAtText: order.completedAt ? formatTime(order.completedAt) : '',
          cancelledAtText: order.cancelledAt ? formatTime(order.cancelledAt) : '',
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
