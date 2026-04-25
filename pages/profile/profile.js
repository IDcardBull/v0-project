// pages/profile/profile.js
const api = require('../../utils/api.js')
const { isLogin } = require('../../utils/request.js')
const app = getApp()

Page({
  data: {
    user: null,
    stats: { pending: 0, paid: 0, shipped: 0, completed: 0 },
  },

  onShow() {
    if (!isLogin()) {
      this.setData({
        user: null,
        stats: { pending: 0, paid: 0, shipped: 0, completed: 0 },
      })
      return
    }
    this.loadProfile()
    this.loadStats()
  },

  onPullDownRefresh() {
    Promise.all([this.loadProfile(), this.loadStats()]).finally(() => wx.stopPullDownRefresh())
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

  async loadStats() {
    try {
      const stats = await api.order.stats()
      this.setData({ stats: stats || this.data.stats })
    } catch (e) {}
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
    this.setData({ user: null, stats: { pending: 0, paid: 0, shipped: 0, completed: 0 } })
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
    wx.showActionSheet({
      itemList: ['呼叫客服热线 400-188-8888'],
      success: (res) => {
        if (res.tapIndex === 0) wx.makePhoneCall({ phoneNumber: '4001888888' })
      },
    })
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
