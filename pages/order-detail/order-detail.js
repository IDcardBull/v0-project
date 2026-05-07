// pages/order-detail/order-detail.js
const api = require('../../utils/api.js')
const {
  formatPrice,
  statusText,
  statusColor,
  formatTime,
  isOrderStatus,
} = require('../../utils/util.js')
const { getDisplayOrderStatus } = require('../../utils/pay.js')
const app = getApp()

Page({
  data: {
    orderId: '',
    order: null,
    loading: true,
    logisticsLoading: false,
    logisticsVisible: false,
    logisticsTraces: [],
    logisticsMessage: '',
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
      const items = (order.items || order.orderItems || order.goods || []).map((it) => ({
        ...it,
        name: it.name || it.productName || it.goodsName || '',
        image: it.image || it.productImage || it.skuImage || '',
        spec: it.spec || it.skuSpec || '',
        qty: it.qty || it.quantity || 0,
        priceText: formatPrice(it.price || it.unitPrice || it.salePrice),
        lineTotalText: formatPrice((Number(it.price || it.unitPrice || it.salePrice) || 0) * (Number(it.qty || it.quantity) || 0)),
      }))
      const totalQty = items.reduce((s, i) => s + (Number(i.qty) || 0), 0)
      const shippingCompany = order.shippingCompany || order.logisticsCompany || order.expressCompany || order.deliveryCompany || ''
      const shippingCompanyCode = order.shippingCompanyCode || order.logisticsCompanyCode || order.expressCompanyCode || order.deliveryCompanyCode || ''
      const shippingNo = order.shippingNo || order.logisticsNo || order.expressNo || order.deliveryNo || order.trackingNo || ''
      const shippedAtText = order.shippedAt || order.deliveryAt ? formatTime(order.shippedAt || order.deliveryAt) : ''
      const displayStatus = getDisplayOrderStatus(order)
      this.setData({
        order: {
          ...order,
          status: displayStatus,
          id: order.id || order.orderId,
          items,
          totalQty,
          shippingCompany,
          shippingCompanyCode,
          shippingNo,
          shippedAtText,
          statusText: statusText(displayStatus),
          statusColor: statusColor(displayStatus),
          isPendingConfirm: isOrderStatus(displayStatus, 'pending'),
          isPaid: isOrderStatus(displayStatus, 'paid'),
          canEditAddress: isOrderStatus(displayStatus, 'pending') || isOrderStatus(displayStatus, 'paid'),
          isShipped: isOrderStatus(displayStatus, 'shipped'),
          isCompleted: isOrderStatus(displayStatus, 'completed'),
          isCancelled: isOrderStatus(displayStatus, 'cancelled'),
          totalAmountText: formatPrice(order.totalAmount || order.payAmount || order.amount),
          goodsAmountText: formatPrice(order.goodsAmount || order.totalAmount || order.payAmount || order.amount),
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

  async changeAddress() {
    const order = this.data.order
    if (!order || !order.canEditAddress) {
      wx.showToast({ title: '订单已发货，无法修改地址', icon: 'none' })
      return
    }

    const that = this
    wx.navigateTo({
      url: '/pages/address/address?picker=1',
      events: {
        async addressSelected(addr) {
          if (!addr || !addr.id) return
          wx.showLoading({ title: '更新地址...', mask: true })
          try {
            await api.order.updateAddress(order.id || that.data.orderId, Number(addr.id))
            wx.showToast({ title: '地址已更新', icon: 'success' })
            that.loadOrder()
          } catch (e) {
            // 已 toast
          } finally {
            wx.hideLoading()
          }
        },
      },
    })
  },

  copyShippingNo() {
    const no = (this.data.order && this.data.order.shippingNo) || ''
    if (!no) return
    wx.setClipboardData({ data: no })
  },

  normalizeLogisticsTraces(data) {
    const raw = (data && (data.traces || data.list || data.items || data.data)) || []
    if (!Array.isArray(raw)) return []
    return raw.map((item) => ({
      time: item.time || item.acceptTime || item.datetime || item.createdAt || '',
      text: item.text || item.context || item.desc || item.description || item.status || '',
    })).filter((item) => item.time || item.text)
  },

  async viewLogistics() {
    if (!this.data.order || !this.data.order.shippingNo) {
      wx.showToast({ title: '暂无物流单号', icon: 'none' })
      return
    }

    this.setData({ logisticsLoading: true, logisticsVisible: true, logisticsMessage: '', logisticsTraces: [] })
    try {
      const data = await api.order.logistics(this.data.orderId)
      const traces = this.normalizeLogisticsTraces(data)
      this.setData({
        logisticsTraces: traces,
        logisticsMessage: traces.length ? '' : '暂无物流轨迹，请稍后再试',
      })
    } catch (e) {
      this.setData({ logisticsMessage: '物流轨迹获取失败，请稍后再试' })
    } finally {
      this.setData({ logisticsLoading: false })
    }
  },

  closeLogistics() {
    this.setData({ logisticsVisible: false })
  },

  noop() {},

  callService() {
    app.callCustomerService()
  },
})
