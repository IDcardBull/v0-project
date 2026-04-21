const { getProductById, getTierPrice } = require('../../utils/products.js')

Page({
  data: {
    product: null,
    qty: 0,
    currentPrice: 0
  },

  onLoad(opts) {
    const product = getProductById(opts.id) || null
    if (!product) {
      wx.showToast({ title: '商品不存在', icon: 'none' })
      return
    }
    const cart = getApp().globalData.cart || []
    const inCart = cart.find(c => c.id === product.id)
    const qty = inCart ? inCart.qty : product.minOrderQty
    this.setData({
      product,
      qty,
      currentPrice: getTierPrice(product, qty)
    })
    wx.setNavigationBarTitle({ title: product.name.slice(0, 12) })
  },

  onQtyChange(e) {
    const qty = e.detail.value
    this.setData({
      qty,
      currentPrice: getTierPrice(this.data.product, qty)
    })
  },

  addToCart() {
    const p = this.data.product
    const qty = this.data.qty
    if (qty < p.minOrderQty) {
      return wx.showToast({ title: `至少 ${p.minOrderQty} ${p.unit} 起批`, icon: 'none' })
    }
    const app = getApp()
    app.upsertCart({
      id: p.id,
      name: p.name,
      image: p.image,
      unit: p.unit,
      qty,
      price: getTierPrice(p, qty)
    })
    wx.showToast({ title: '已加入采购单', icon: 'success' })
  },

  callService() {
    wx.makePhoneCall({ phoneNumber: '4001888888' })
  },

  goCart() {
    wx.switchTab({ url: '/pages/cart/cart' })
  }
})
