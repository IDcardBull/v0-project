const { products, categories, getByCategory } = require('../../utils/products.js')

Page({
  data: {
    categories,
    activeCat: 'all',
    sortOptions: [
      { id: 'default', name: '综合' },
      { id: 'sales',   name: '销量' },
      { id: 'price',   name: '价格' },
      { id: 'new',     name: '新品' }
    ],
    sortBy: 'default',
    list: [],
    cartMap: {}
  },

  onLoad() {
    this.refreshList()
    this.refreshCartMap()
  },

  onShow() {
    this.refreshCartMap()
    getApp().refreshTabBadge && getApp().refreshTabBadge()
  },

  onPullDownRefresh() {
    this.refreshList()
    wx.stopPullDownRefresh()
  },

  refreshCartMap() {
    const cart = (getApp().globalData.cart) || []
    const m = {}
    cart.forEach(c => { m[c.id] = c.qty })
    this.setData({ cartMap: m })
  },

  refreshList() {
    let list = getByCategory(this.data.activeCat).slice()
    switch (this.data.sortBy) {
      case 'sales': list.sort((a, b) => b.soldRecent - a.soldRecent); break
      case 'price': list.sort((a, b) => a.price - b.price); break
      case 'new':   list.sort((a, b) => b.id.localeCompare(a.id)); break
    }
    this.setData({ list })
  },

  onCatTap(e) {
    const id = e.currentTarget.dataset.id
    this.setData({ activeCat: id }, () => this.refreshList())
  },

  onSortTap(e) {
    const id = e.currentTarget.dataset.id
    this.setData({ sortBy: id }, () => this.refreshList())
  },

  openFilter() {
    wx.showActionSheet({
      itemList: ['景德镇产区', '潮州产区', '手绘工艺', '可定制 Logo', '48h 发货'],
      success: () => wx.showToast({ title: '已应用筛选', icon: 'success' })
    })
  },

  goSearch() {
    wx.navigateTo({ url: '/pages/search/search' })
  },

  onQtyChange() {
    this.refreshCartMap()
  }
})
