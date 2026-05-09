// app.js
const cart = require('./utils/cart.js')
const api = require('./utils/api.js')

// 站点配置默认值（后端 /client/config 接口未实现时的降级）
const DEFAULT_SITE_CONFIG = {
  customerServicePhone: '',     // 客服热线
  customerServiceWechat: '',    // 客服微信
  hotKeywords: [],              // 热门搜索词
  agreementUrl: '',             // 用户协议 URL
  privacyUrl: '',               // 隐私政策 URL
  freeShippingThreshold: 0,     // 满 X 元包邮，0 = 关闭
  wecomBotKey: '',              // 企业微信机器人 key（用于B2B采购单通知）
  wecomWebhookKey: '',          // 兼容字段：企业微信机器人 key
  about: '',                    // 关于我们文本
}

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

    const adminToken = wx.getStorageSync('adminToken')
    if (adminToken) {
      this.globalData.adminToken = adminToken
      this.globalData.adminInfo = wx.getStorageSync('adminInfo') || null
    }

    // 优先使用本地缓存的站点配置（避免冷启动空白）
    const cached = wx.getStorageSync('siteConfig')
    if (cached) {
      this.globalData.siteConfig = { ...DEFAULT_SITE_CONFIG, ...cached }
    }

    // 异步拉取最新配置
    this.loadSiteConfig()

    // 记录小程序版本（profile 页展示）
    try {
      const info = wx.getAccountInfoSync()
      this.globalData.version =
        (info && info.miniProgram && info.miniProgram.version) || ''
      this.globalData.envVersion =
        (info && info.miniProgram && info.miniProgram.envVersion) || ''
    } catch (e) {}
  },

  onShow() {
    this.refreshCartBadge()
  },

  // 拉取站点配置（客服电话 / 热搜 / 协议 URL …）
  async loadSiteConfig() {
    try {
      const cfg = await api.config.get()
      if (cfg && typeof cfg === 'object') {
        this.globalData.siteConfig = { ...DEFAULT_SITE_CONFIG, ...cfg }
        wx.setStorageSync('siteConfig', this.globalData.siteConfig)
      }
    } catch (e) {
      // 后端没该接口时静默失败
    }
  },

  // 获取站点配置（任意页面调用）
  getSiteConfig() {
    return this.globalData.siteConfig || DEFAULT_SITE_CONFIG
  },

  // 企业微信机器人 key（优先后端站点配置，兼容本地调试配置）
  getWecomBotKey() {
    const cfg = this.getSiteConfig()
    return cfg.wecomBotKey || cfg.wecomWebhookKey || wx.getStorageSync('wecom_bot_key') || ''
  },

  setWecomBotKey(key) {
    if (key) wx.setStorageSync('wecom_bot_key', key)
  },

  // 统一的"联系客服"入口
  callCustomerService() {
    const cfg = this.getSiteConfig()
    const phone = cfg.customerServicePhone
    if (!phone) {
      wx.showToast({ title: '客服电话暂未配置', icon: 'none' })
      return
    }
    wx.showActionSheet({
      itemList: [`呼叫客服 ${phone}`],
      success: (res) => {
        if (res.tapIndex === 0) {
          wx.makePhoneCall({ phoneNumber: phone.replace(/[^\d]/g, '') })
        }
      },
    })
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


  // ---------- 管理员（移动端工作台）----------
  setAdmin(payload) {
    if (!payload) return
    const token = payload.token || ''
    const user = payload.user || null
    this.globalData.adminToken = token
    this.globalData.adminInfo = user
    if (token) wx.setStorageSync('adminToken', token)
    if (user) wx.setStorageSync('adminInfo', user)
  },
  clearAdmin() {
    this.globalData.adminToken = ''
    this.globalData.adminInfo = null
    wx.removeStorageSync('adminToken')
    wx.removeStorageSync('adminInfo')
  },
  isAdmin() {
    return !!(this.globalData.adminToken || wx.getStorageSync('adminToken'))
  },

  globalData: {
    adminToken: '',
    adminInfo: null,
    token: '',
    userInfo: null,
    companyName: '央皿陶瓷',
    version: '',
    envVersion: '',
    siteConfig: { ...DEFAULT_SITE_CONFIG },
  },
})
