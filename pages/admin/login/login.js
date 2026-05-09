// pages/admin/login/login.js
const app = getApp()
const api = require('../../../utils/api.js')

Page({
  data: {
    username: '',
    password: '',
    loading: false,
    error: '',
    redirect: '',
  },
  onLoad(options) {
    this.setData({
      redirect: options.redirect ? decodeURIComponent(options.redirect) : '',
      username: wx.getStorageSync('lastAdminUsername') || '',
    })
  },
  onUsername(e) { this.setData({ username: e.detail.value, error: '' }) },
  onPassword(e) { this.setData({ password: e.detail.value, error: '' }) },
  async submit() {
    if (this.data.loading) return
    const username = (this.data.username || '').trim()
    const password = this.data.password || ''
    if (!username) return this.setData({ error: '请输入账号' })
    if (password.length < 6) return this.setData({ error: '密码至少 6 位' })
    this.setData({ loading: true, error: '' })
    try {
      const data = await api.admin.login(username, password)
      app.setAdmin(data)
      wx.setStorageSync('lastAdminUsername', username)
      wx.showToast({ title: '已进入工作台', icon: 'none' })
      const target = this.data.redirect || '/pages/admin/index/index'
      setTimeout(() => {
        wx.redirectTo({
          url: target,
          fail: () => wx.redirectTo({ url: '/pages/admin/index/index' }),
        })
      }, 220)
    } catch (err) {
      this.setData({ error: (err && err.message) || '登录失败' })
    } finally {
      this.setData({ loading: false })
    }
  },
})
