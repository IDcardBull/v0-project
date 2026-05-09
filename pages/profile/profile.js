// pages/profile/profile.js
const api = require('../../utils/api.js')
const { isLogin } = require('../../utils/request.js')
const { normalizeOrderStatus } = require('../../utils/util.js')
const app = getApp()

Page({
  data: {
    user: null,
    stats: { pending: 0, paid: 0, shipped: 0, completed: 0, afterSale: 0 },
    version: '',
    customerServicePhone: '',
  },

  onLoad() {
    // 版本号：来自微信运行时
    this.setData({
      version: app.globalData.version || '',
      customerServicePhone: app.getSiteConfig().customerServicePhone || '',
    })
  },

  onShow() {
    // 站点配置可能在 onLaunch 后异步刷新过，这里同步取一次
    this.setData({
      customerServicePhone: app.getSiteConfig().customerServicePhone || '',
    })

    if (!isLogin()) {
      this.setData({
        user: null,
        stats: { pending: 0, paid: 0, shipped: 0, completed: 0, afterSale: 0 },
      })
      return
    }
    this.loadProfile()
    this.loadStats()
  },

  onPullDownRefresh() {
    Promise.all([this.loadProfile(), this.loadStats(), app.loadSiteConfig()])
      .finally(() => wx.stopPullDownRefresh())
  },

  async loadProfile() {
    try {
      const user = await api.user.profile()
      app.globalData.userInfo = user
      wx.setStorageSync('userInfo', user)
      this.setData({ user })
    } catch (e) {
      // 401 已被 request 自动跳登录
    }
  },

  normalizeStats(stats = {}) {
    const result = { pending: 0, paid: 0, shipped: 0, completed: 0, afterSale: 0 }
    Object.keys(stats || {}).forEach((key) => {
      const group = normalizeOrderStatus(key)
      const count = Number(stats[key]) || 0
      if (group === 'pending') result.pending += count
      else if (group === 'paid') result.paid += count
      else if (group === 'shipped') result.shipped += count
      else if (group === 'completed') result.completed += count
      else if (group === 'after_sale') result.afterSale += count
    })
    return result
  },

  async loadStats() {
    try {
      const stats = await api.order.stats()
      this.setData({ stats: this.normalizeStats(stats) })
    } catch (e) {
      try {
        const res = await api.order.list({ page: 1, pageSize: 100 })
        const list = Array.isArray(res) ? res : (res && (res.list || res.items || res.records || res.data)) || []
        const stats = {}
        list.forEach((order) => {
          const key = order && order.status
          if (!key) return
          stats[key] = (stats[key] || 0) + 1
        })
        this.setData({ stats: this.normalizeStats(stats) })
      } catch (err) {}
    }
  },

  goLogin() {
    if (this.data.user) {
      wx.showActionSheet({
        itemList: ['退出登录'],
        success: (res) => {
          if (res.tapIndex === 0) {
            this.logout()
          }
        },
      })
      return
    }
    wx.navigateTo({ url: '/pages/login/login' })
  },

  logout() {
    wx.removeStorageSync('token')
    wx.removeStorageSync('userInfo')
    app.globalData.userInfo = null
    this.setData({
      user: null,
      stats: { pending: 0, paid: 0, shipped: 0, completed: 0, afterSale: 0 },
    })
    wx.showToast({ title: '已退出登录', icon: 'success' })
  },

  goOrders(e) {
    if (!this.requireLogin()) return
    const status = (e && e.currentTarget && e.currentTarget.dataset.status) || ''
    wx.navigateTo({ url: `/pages/orders/orders?status=${status}` })
  },

  goAddress() {
    if (!this.requireLogin()) return
    wx.navigateTo({ url: '/pages/address/address' })
  },

  callService() {
    app.callCustomerService()
  },

  // 关于央皿陶瓷：弹出公司简介
  // 隐藏：连续 7 次点击进入主理人工作台登录入口
  _aboutTaps: 0,
  _aboutTimer: null,
  showAbout() {
    this._aboutTaps = (this._aboutTaps || 0) + 1
    if (this._aboutTimer) clearTimeout(this._aboutTimer)
    this._aboutTimer = setTimeout(() => { this._aboutTaps = 0 }, 1500)

    if (this._aboutTaps >= 7) {
      this._aboutTaps = 0
      if (app.isAdmin()) {
        wx.navigateTo({ url: '/pages/admin/index/index' })
      } else {
        wx.navigateTo({ url: '/pages/admin/login/login' })
      }
      return
    }

    const cfg = app.getSiteConfig()
    const content = cfg.about || `${app.globalData.companyName} · 景德镇源头工厂\n版本 ${this.data.version || '未知'}`
    wx.showModal({
      title: '关于我们',
      content,
      showCancel: false,
      confirmText: '知道了',
    })
  },

  // 用户协议 / 隐私政策
  showAgreement() {
    this._openDocument('agreementUrl', '用户协议',
      `《央皿陶瓷批发用户协议》\n\n本协议由用户与央皿陶瓷共同确认...\n\n（完整内容请联系客服或访问官网获取）`)
  },
  showPrivacy() {
    this._openDocument('privacyUrl', '隐私政策',
      `《央皿陶瓷隐私政策》\n\n我们高度重视用户隐私保护...\n\n（完整内容请联系客服或访问官网获取）`)
  },
  _openDocument(urlKey, title, fallbackText) {
    const cfg = app.getSiteConfig()
    const url = cfg[urlKey]
    if (url) {
      wx.navigateTo({
        url: `/pages/webview/webview?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`,
        fail: () => {
          // 没有 webview 页时降级 modal
          wx.showModal({ title, content: fallbackText, showCancel: false })
        },
      })
      return
    }
    wx.showModal({ title, content: fallbackText, showCancel: false })
  },

  notImpl() {
    wx.showToast({ title: '功能开发中', icon: 'none' })
  },

  requireLogin() {
    if (!isLogin()) {
      wx.navigateTo({ url: '/pages/login/login' })
      return false
    }
    return true
  },
})
