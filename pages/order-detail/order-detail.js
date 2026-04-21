const { getOrderById } = require('../../utils/orders.js')
const { formatMoney, genOrderNo } = require('../../utils/util.js')

Page({
  data: {
    mode: 'new',     // 'new' 新建询价单 | 'view' 查看订单
    order: null,
    items: [],
    goodsAmount: '0.00',
    totalAmount: '0.00',
    address: null,
    remark: ''
  },

  onLoad(opts) {
    const mode = opts.mode || (opts.id ? 'view' : 'new')
    let items = []
    let order = null
    if (mode === 'view') {
      order = getOrderById(opts.id)
      if (order) {
        items = order.items.map(it => ({
          ...it,
          lineTotal: formatMoney(it.price * it.qty)
        }))
      }
    } else {
      items = (wx.getStorageSync('checkoutItems') || []).map(it => ({
        ...it,
        lineTotal: formatMoney(it.price * it.qty)
      }))
    }
    const goodsAmount = items.reduce((s, i) => s + i.price * i.qty, 0)
    this.setData({
      mode,
      order,
      items,
      goodsAmount: formatMoney(goodsAmount),
      totalAmount: formatMoney(goodsAmount),
      address: wx.getStorageSync('defaultAddress') || null
    })
  },

  onShow() {
    const addr = wx.getStorageSync('defaultAddress')
    if (addr) this.setData({ address: addr })
  },

  pickAddress() {
    wx.navigateTo({ url: '/pages/address/address?pick=1' })
  },

  onRemark(e) {
    this.setData({ remark: e.detail.value })
  },

  submitOrder() {
    if (!this.data.address) {
      return wx.showToast({ title: '请先选择收货地址', icon: 'none' })
    }
    if (this.data.items.length === 0) {
      return wx.showToast({ title: '没有可提交的商品', icon: 'none' })
    }
    wx.showLoading({ title: '提交中...' })
    setTimeout(() => {
      wx.hideLoading()
      // 清空采购单中已下单的商品
      const app = getApp()
      const ids = this.data.items.map(i => i.id)
      app.globalData.cart = (app.globalData.cart || []).filter(c => !ids.includes(c.id))
      wx.setStorageSync('cart', app.globalData.cart)
      app.refreshTabBadge()
      wx.showModal({
        title: '询价单提交成功',
        content: `单号 ${genOrderNo()}，专属商务将在 2 小时内联系您。`,
        showCancel: false,
        success: () => {
          wx.switchTab({ url: '/pages/index/index' })
        }
      })
    }, 600)
  },

  reorder() {
    const app = getApp()
    this.data.items.forEach(it => {
      app.upsertCart({ id: it.id, name: it.name, image: it.image, unit: it.unit, qty: it.qty, price: it.price })
    })
    wx.switchTab({ url: '/pages/cart/cart' })
  }
})
