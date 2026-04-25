// app.js
const cart = require('./utils/cart.js')

App({
  onLaunch() {
    // 启动时刷新 tabBar 采购单角标
    this.refreshCartBadge()

    // 校验 token，无效则清空（页面遇到 401 时会自动跳登录）
    const token = wx.getStorageSync('token')
    if (token) {
      this.globalData.token = token
      this.globalData.userInfo = wx.getStorageSync('userInfo') || null
    }
  },

  onShow() {
    this.refreshCartBadge()
  },

  // 检查是否登录
  isLogin() {
    return !!wx.getStorageSync('token')
  },

  // 引导登录（页面调用）
  ensureLogin() {
    if (this.isLogin()) return true
    wx.navigateTo({ url: '/pages/login/login' })
    return false
  },

  // 设置登录态
  setLogin({ token, user }) {
    if (token) wx.setStorageSync('token', token)
    if (user) wx.setStorageSync('userInfo', user)
    this.globalData.token = token
    this.globalData.userInfo = user
  },

  // 退出登录
  logout() {
    wx.removeStorageSync('token')
    wx.removeStorageSync('userInfo')
    this.globalData.token = ''
    this.globalData.userInfo = null
  },

  // 刷新 tabBar 第三个 tab "采购单" 的红色角标
  refreshCartBadge() {
    const count = cart.totalCount()
    try {
      if (count > 0) {
        wx.setTabBarBadge({ index: 2, text: String(count > 99 ? '99+' : count) })
      } else {
        wx.removeTabBarBadge({ index: 2 })
      }
    } catch (e) {
      // 不在 tabBar 页时调用会报错，忽略
    }
  },

  globalData: {
    token: '',
    userInfo: null,
    companyName: '央茗陶瓷',
    // 「立即购买」临时载荷：详情页 -> checkout，避免冗长 URL 参数
    buyNowPayload: null,
  },
})
