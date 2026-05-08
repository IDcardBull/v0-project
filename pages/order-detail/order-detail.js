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
      const items = (order.items || []).map((it) => {
        const price = it.unitPrice != null ? it.unitPrice : it.price
        const qty = Number(it.qty) || 0
        const lineTotal = it.subtotal != null ? Number(it.subtotal) : (Number(price) || 0) * qty
        return {
          ...it,
          name: it.productName || it.name,
          // 后端 skuSpec 是 JSON 字符串：'{"颜色":"青花","尺寸":"中号"}'，转成可读字符串
          spec: this.formatSpec(it.skuSpec || it.spec),
          image: it.skuImage || it.image,
          priceText: formatPrice(price),
          lineTotalText: formatPrice(lineTotal),
        }
      })
      const totalQty = items.reduce((s, i) => s + (Number(i.qty) || 0), 0)
      // 收货地址：优先用 receiverSnapshot（下单时快照），否则用关联 address
      const addr = order.receiverSnapshot || order.address || null
      const goodsAmount =
        Number(order.totalAmount || 0) -
        Number(order.freight || 0) +
        Number(order.discountAmount || 0)
      this.setData({
        order: {
          ...order,
          id: String(order.id != null ? order.id : ''),
          items,
          totalQty,
          address: addr,
          statusText: statusText(order.status),
          statusColor: statusColor(order.status),
          totalAmountText: formatPrice(order.totalAmount),
          goodsAmountText: formatPrice(goodsAmount),
          freightText: formatPrice(order.freight),
          discountAmountText: order.discountAmount ? formatPrice(order.discountAmount) : '',
          paidAmountText: formatPrice(order.paidAmount),
          createdAtText: formatTime(order.createdAt),
          paidAtText: order.paidAt ? formatTime(order.paidAt) : '',
          shippedAtText: order.shippedAt ? formatTime(order.shippedAt) : '',
          completedAtText: order.completedAt ? formatTime(order.completedAt) : '',
          closedAtText: order.closedAt ? formatTime(order.closedAt) : '',
        },
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 把后端的 skuSpec JSON 字符串转成 "颜色:青花 / 尺寸:中号" 这种展示串
  formatSpec(spec) {
    if (!spec) return ''
    if (typeof spec === 'object') {
      return Object.entries(spec).map(([k, v]) => `${k}:${v}`).join(' / ')
    }
    if (typeof spec === 'string') {
      const trimmed = spec.trim()
      if (trimmed.startsWith('{')) {
        try {
          const obj = JSON.parse(trimmed)
          return Object.entries(obj).map(([k, v]) => `${k}:${v}`).join(' / ')
        } catch (e) {
          return trimmed
        }
      }
      return trimmed
    }
    return ''
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
