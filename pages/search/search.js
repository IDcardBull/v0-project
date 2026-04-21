const { search } = require('../../utils/products.js')

const HIST_KEY = 'searchHistory'

Page({
  data: {
    keyword: '',
    history: [],
    hotKeywords: ['功夫茶具', '青花瓷', '手绘盖碗', '酒店白瓷', '景德镇', '定制刻字'],
    searched: false,
    list: [],
    cartMap: {}
  },

  onShow() {
    this.setData({
      history: wx.getStorageSync(HIST_KEY) || [],
      cartMap: this._getCartMap()
    })
  },

  _getCartMap() {
    const cart = getApp().globalData.cart || []
    const m = {}
    cart.forEach(c => { m[c.id] = c.qty })
    return m
  },

  onInput(e) {
    this.setData({ keyword: e.detail.value })
    if (!e.detail.value) this.setData({ searched: false, list: [] })
  },

  onTagTap(e) {
    const kw = e.currentTarget.dataset.kw
    this.setData({ keyword: kw })
    this.doSearch()
  },

  doSearch() {
    const kw = (this.data.keyword || '').trim()
    if (!kw) return
    const list = search(kw)
    // 保存历史
    let hist = wx.getStorageSync(HIST_KEY) || []
    hist = [kw, ...hist.filter(h => h !== kw)].slice(0, 10)
    wx.setStorageSync(HIST_KEY, hist)
    this.setData({ searched: true, list, history: hist })
  },

  clearInput() {
    this.setData({ keyword: '', searched: false, list: [] })
  },

  clearHistory() {
    wx.setStorageSync(HIST_KEY, [])
    this.setData({ history: [] })
  },

  cancel() {
    wx.navigateBack({ delta: 1, fail: () => wx.switchTab({ url: '/pages/index/index' }) })
  },

  onQtyChange() {
    this.setData({ cartMap: this._getCartMap() })
  }
})
