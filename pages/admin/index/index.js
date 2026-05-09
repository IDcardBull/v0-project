// pages/admin/index/index.js
const app = getApp()
const api = require('../../../utils/api.js')
const { fmtMoney } = require('../../../utils/admin-format.js')

Page({
  data: {
    admin: null,
    overview: {
      todayOrderCount: 0,
      todayOrderAmount: '0.00',
      pendingShipCount: 0,
      lowStockCount: 0,
      productCount: 0,
      skuCount: 0,
    },
    counts: { pending_pay: 0, pending_ship: 0, shipped: 0, completed: 0, after_sale: 0 },
    loading: true,
  },
  onLoad() {
    this.setData({ admin: app.globalData.adminInfo || wx.getStorageSync('adminInfo') })
  },
  onShow() {
    if (!app.isAdmin()) {
      wx.redirectTo({ url: '/pages/admin/login/login?redirect=%2Fpages%2Fadmin%2Findex%2Findex' })
      return
    }
    this.fetch()
  },
  onPullDownRefresh() {
    this.fetch().finally(() => wx.stopPullDownRefresh())
  },
  fetch() {
    this.setData({ loading: true })
    return Promise.all([
      api.admin.dashboard.overview().catch(() => null),
      api.admin.order.counts().catch(() => null),
      api.admin.profile().catch(() => null),
    ]).then(([overview, counts, profile]) => {
      const next = { loading: false }
      if (overview) {
        next.overview = {
          todayOrderCount: Number(overview.todayOrderCount || 0),
          todayOrderAmount: fmtMoney(overview.todayOrderAmount),
          pendingShipCount: Number(overview.pendingShipCount || 0),
          lowStockCount: Number(overview.lowStockCount || 0),
          productCount: Number(overview.productCount || 0),
          skuCount: Number(overview.skuCount || 0),
        }
      }
      if (counts) {
        next.counts = Object.assign({}, this.data.counts, counts)
      }
      if (profile) {
        next.admin = profile
        app.globalData.adminInfo = profile
        wx.setStorageSync('adminInfo', profile)
      }
      this.setData(next)
    })
  },
  goOrders(e) {
    const status = e.currentTarget.dataset.status || ''
    wx.navigateTo({ url: `/pages/admin/orders/orders${status ? '?status=' + status : ''}` })
  },
  goProducts() { wx.navigateTo({ url: '/pages/admin/products/products' }) },
  goShop() { wx.switchTab({ url: '/pages/index/index' }) },
  signOut() {
    wx.showModal({
      title: '退出工作台',
      content: '退出后将回到客户端身份。',
      confirmText: '退出',
      cancelText: '取消',
      success: ({ confirm }) => {
        if (!confirm) return
        api.admin.logout().catch(() => {})
        app.clearAdmin()
        wx.redirectTo({ url: '/pages/admin/login/login' })
      },
    })
  },
})
