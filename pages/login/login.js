// pages/login/login.js
const api = require('../../utils/api.js')
const app = getApp()

Page({
  data: {
    phone: '',
    code: '',
    agree: false,
    counting: false,
    countdown: 60,
    loading: false,
  },

  onUnload() {
    if (this._timer) clearInterval(this._timer)
  },

  onPhoneInput(e) {
    this.setData({ phone: e.detail.value.trim() })
  },
  onCodeInput(e) {
    this.setData({ code: e.detail.value.trim() })
  },
  toggleAgree() {
    this.setData({ agree: !this.data.agree })
  },

  sendCode() {
    const { phone, counting } = this.data
    if (counting) return
    if (!/^1\d{10}$/.test(phone)) {
      wx.showToast({ title: '请输入正确手机号', icon: 'none' })
      return
    }
    this.setData({ counting: true, countdown: 60 })
    // TODO：对接 /client/auth/send-code 接口；后端尚未提供，先仅做倒计时
    wx.showToast({ title: '验证码已发送', icon: 'none' })
    this._timer = setInterval(() => {
      const n = this.data.countdown - 1
      if (n <= 0) {
        clearInterval(this._timer)
        this.setData({ counting: false, countdown: 60 })
      } else {
        this.setData({ countdown: n })
      }
    }, 1000)
  },

  // 手机号 + 验证码登录
  async onPhoneLogin() {
    const { phone, code, agree, loading } = this.data
    if (loading) return
    if (!agree) {
      wx.showToast({ title: '请先同意协议', icon: 'none' })
      return
    }
    if (!/^1\d{10}$/.test(phone)) {
      wx.showToast({ title: '请输入正确手机号', icon: 'none' })
      return
    }
    if (!code || code.length < 4) {
      wx.showToast({ title: '请输入验证码', icon: 'none' })
      return
    }
    this.setData({ loading: true })
    try {
      const res = await api.auth.phoneLogin(phone, code)
      app.setLogin(res)
      wx.showToast({ title: '登录成功', icon: 'success' })
      setTimeout(() => this.afterLogin(), 600)
    } catch (e) {
      // request 已 toast
    } finally {
      this.setData({ loading: false })
    }
  },

  // 微信一键登录
  onWxLogin() {
    if (!this.data.agree) {
      wx.showToast({ title: '请先同意协议', icon: 'none' })
      return
    }
    wx.login({
      success: async ({ code }) => {
        if (!code) {
          wx.showToast({ title: '获取微信授权失败', icon: 'none' })
          return
        }
        try {
          this.setData({ loading: true })
          const res = await api.auth.miniLogin(code)
          app.setLogin(res)
          wx.showToast({ title: '登录成功', icon: 'success' })
          setTimeout(() => this.afterLogin(), 600)
        } catch (e) {
          // request 已 toast
        } finally {
          this.setData({ loading: false })
        }
      },
      fail: () => {
        wx.showToast({ title: '微信登录失败，请重试', icon: 'none' })
      },
    })
  },

  // 登录后回到上一页或我的
  afterLogin() {
    const pages = getCurrentPages()
    if (pages.length > 1) {
      wx.navigateBack()
    } else {
      wx.switchTab({ url: '/pages/profile/profile' })
    }
  },

  // 协议 / 隐私
  showAgreement() {
    const cfg = app.getSiteConfig()
    if (cfg.agreementUrl) {
      wx.setClipboardData({
        data: cfg.agreementUrl,
        success: () =>
          wx.showModal({ title: '用户协议', content: '协议链接已复制到剪贴板，可在浏览器打开查看。', showCancel: false }),
      })
      return
    }
    wx.showModal({
      title: '用户协议',
      content: '《央茗陶瓷批发用户协议》\n\n本协议由用户与央茗陶瓷共同确认。完整协议请联系客服获取。',
      showCancel: false,
      confirmText: '我已知晓',
    })
  },
  showPrivacy() {
    const cfg = app.getSiteConfig()
    if (cfg.privacyUrl) {
      wx.setClipboardData({
        data: cfg.privacyUrl,
        success: () =>
          wx.showModal({ title: '隐私政策', content: '政策链接已复制到剪贴板，可在浏览器打开查看。', showCancel: false }),
      })
      return
    }
    wx.showModal({
      title: '隐私政策',
      content: '《央茗陶瓷隐私政策》\n\n我们高度重视用户隐私保护。完整内容请联系客服获取。',
      showCancel: false,
      confirmText: '我已知晓',
    })
  },
})
