Page({
  data: {
    userInfo: null,
    stats: { unpaid: 1, paid: 1, shipped: 1, done: 5 }
  },

  onShow() {
    const userInfo = wx.getStorageSync('userInfo') || null
    this.setData({ userInfo })
  },

  goLogin() {
    if (this.data.userInfo) {
      wx.showToast({ title: '认证资料审核中', icon: 'none' })
      return
    }
    wx.navigateTo({ url: '/pages/login/login' })
  },

  goOrders(e) {
    const status = (e && e.currentTarget && e.currentTarget.dataset.status) || 'all'
    wx.navigateTo({ url: `/pages/orders/orders?status=${status}` })
  },

  goAddress() {
    wx.navigateTo({ url: '/pages/address/address' })
  },

  callService() {
    wx.showActionSheet({
      itemList: ['在线咨询', '呼叫：400-188-8888', '添加专属客服微信'],
      success: (res) => {
        if (res.tapIndex === 1) wx.makePhoneCall({ phoneNumber: '4001888888' })
      }
    })
  }
})
