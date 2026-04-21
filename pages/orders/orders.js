const { mockOrders } = require('../../utils/orders.js')

Page({
  data: {
    tabs: [
      { id: 'all',     name: '全部' },
      { id: 'unpaid',  name: '待付款' },
      { id: 'paid',    name: '待发货' },
      { id: 'shipped', name: '已发货' },
      { id: 'done',    name: '已完成' }
    ],
    activeTab: 'all',
    list: []
  },

  onLoad(opts) {
    if (opts.status) {
      this.setData({ activeTab: opts.status })
    }
    this.refresh()
  },

  refresh() {
    const s = this.data.activeTab
    const list = s === 'all' ? mockOrders : mockOrders.filter(o => o.status === s)
    this.setData({ list })
  },

  switchTab(e) {
    this.setData({ activeTab: e.currentTarget.dataset.id }, () => this.refresh())
  },

  goDetail(e) {
    wx.navigateTo({ url: `/pages/order-detail/order-detail?id=${e.currentTarget.dataset.id}` })
  }
})
