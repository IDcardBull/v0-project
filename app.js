// app.js
App({
  onLaunch() {
    // 读取本地缓存的采购单
    const cart = wx.getStorageSync('cart') || []
    this.globalData.cart = cart
  },

  // 获取采购单总件数（供 tabBar 角标使用）
  getCartCount() {
    return (this.globalData.cart || []).reduce((s, it) => s + (it.qty || 0), 0)
  },

  // 新增 / 更新 采购单条目
  upsertCart(item) {
    const cart = this.globalData.cart || []
    const idx = cart.findIndex(c => c.id === item.id)
    if (idx >= 0) {
      cart[idx].qty = item.qty
    } else {
      cart.push(item)
    }
    this.globalData.cart = cart.filter(c => c.qty > 0)
    wx.setStorageSync('cart', this.globalData.cart)
    this.refreshTabBadge()
  },

  removeFromCart(id) {
    this.globalData.cart = (this.globalData.cart || []).filter(c => c.id !== id)
    wx.setStorageSync('cart', this.globalData.cart)
    this.refreshTabBadge()
  },

  clearCart() {
    this.globalData.cart = []
    wx.setStorageSync('cart', [])
    this.refreshTabBadge()
  },

  // 刷新 tabBar "采购单" 的红色角标
  refreshTabBadge() {
    const count = this.getCartCount()
    if (count > 0) {
      wx.setTabBarBadge({ index: 2, text: String(count > 99 ? '99+' : count) }).catch(() => {})
    } else {
      wx.removeTabBarBadge({ index: 2 }).catch(() => {})
    }
  },

  globalData: {
    cart: [],
    userInfo: null,
    companyName: '央茗陶瓷'
  }
})
