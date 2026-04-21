const { categories, getByCategory } = require('../../utils/products.js')

const subCatMap = {
  all: [
    { name: '全部商品', icon: '全' },
    { name: '新品上架', icon: '新' },
    { name: '爆款工厂', icon: '爆' },
    { name: '特惠专场', icon: '特' },
    { name: '可定制', icon: '定' },
    { name: '48h 发货', icon: '快' }
  ],
  'tea-set': [
    { name: '功夫茶具', icon: '功' },
    { name: '旅行茶具', icon: '旅' },
    { name: '盖碗套装', icon: '盖' },
    { name: '壶承茶盘', icon: '盘' },
    { name: '茶器配件', icon: '件' },
    { name: '礼盒套装', icon: '礼' }
  ],
  cup: [
    { name: '主人杯', icon: '主' },
    { name: '品茗杯', icon: '品' },
    { name: '马克杯', icon: '马' },
    { name: '咖啡杯', icon: '咖' },
    { name: '单色釉', icon: '釉' },
    { name: '手绘杯', icon: '绘' }
  ],
  gaiwan:    [{ name: '三才盖碗', icon: '盖' }, { name: '双层盖碗', icon: '双' }, { name: '手绘粉彩', icon: '粉' }],
  vase:      [{ name: '摆件花瓶', icon: '瓶' }, { name: '青花系列', icon: '青' }, { name: '收藏级', icon: '藏' }],
  tableware: [{ name: '碗盘', icon: '碗' }, { name: '餐具套装', icon: '套' }, { name: '酒店用瓷', icon: '店' }],
  custom:    [{ name: '企业 Logo', icon: 'L' }, { name: '文创定制', icon: '文' }, { name: '单色定烧', icon: '烧' }]
}

Page({
  data: {
    categories,
    activeCat: 'all',
    activeCatName: '全部商品',
    subCats: subCatMap.all,
    recList: []
  },

  onLoad() {
    this.refreshRec()
  },

  refreshRec() {
    const list = getByCategory(this.data.activeCat).slice(0, 6)
    this.setData({ recList: list })
  },

  onCatTap(e) {
    const id = e.currentTarget.dataset.id
    const cat = categories.find(c => c.id === id)
    this.setData({
      activeCat: id,
      activeCatName: cat ? cat.name + '精选' : '',
      subCats: subCatMap[id] || []
    }, () => this.refreshRec())
  },

  onSubCatTap(e) {
    const name = e.currentTarget.dataset.name
    wx.showToast({ title: `进入「${name}」`, icon: 'none' })
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}` })
  },

  goSearch() {
    wx.navigateTo({ url: '/pages/search/search' })
  }
})
