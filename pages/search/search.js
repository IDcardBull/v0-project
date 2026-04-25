// pages/search/search.js
const api = require('../../utils/api.js')

const HIST_KEY = 'searchHistory'
const PAGE_SIZE = 10

Page({
  data: {
    keyword: '',
    history: [],
    hotKeywords: ['功夫茶具', '青花瓷', '手绘盖碗', '酒店白瓷', '景德镇', '定制刻字'],
    searched: false,
    list: [],
    page: 1,
    hasMore: false,
    loading: false,
    categoryId: 0,
  },

  onLoad(options) {
    if (options && options.categoryId) {
      // 来自分类页的过滤跳转
      this.setData({ categoryId: Number(options.categoryId), searched: true })
      this.refresh()
    }
  },

  onShow() {
    this.setData({ history: wx.getStorageSync(HIST_KEY) || [] })
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) this.loadMore()
  },

  onInput(e) {
    this.setData({ keyword: e.detail.value })
    if (!e.detail.value) this.setData({ searched: false, list: [] })
  },

  onTagTap(e) {
    const kw = e.currentTarget.dataset.kw
    this.setData({ keyword: kw, categoryId: 0 })
    this.doSearch()
  },

  doSearch() {
    const kw = (this.data.keyword || '').trim()
    if (!kw && !this.data.categoryId) return
    if (kw) {
      let hist = wx.getStorageSync(HIST_KEY) || []
      hist = [kw, ...hist.filter((h) => h !== kw)].slice(0, 10)
      wx.setStorageSync(HIST_KEY, hist)
      this.setData({ history: hist })
    }
    this.refresh()
  },

  async refresh() {
    this.setData({ page: 1, list: [], hasMore: true, loading: true, searched: true })
    try {
      const res = await this.fetch(1)
      this.setData({ list: res.list || [], hasMore: (res.list || []).length >= PAGE_SIZE && (res.list || []).length < res.total })
    } catch (e) {} finally {
      this.setData({ loading: false })
    }
  },

  async loadMore() {
    this.setData({ loading: true })
    try {
      const next = this.data.page + 1
      const res = await this.fetch(next)
      const merged = this.data.list.concat(res.list || [])
      this.setData({ list: merged, page: next, hasMore: merged.length < res.total })
    } catch (e) {} finally {
      this.setData({ loading: false })
    }
  },

  fetch(page) {
    const params = { page, pageSize: PAGE_SIZE, sort: 'sales' }
    if (this.data.keyword) params.keyword = this.data.keyword
    if (this.data.categoryId) params.categoryId = this.data.categoryId
    return api.product.list(params)
  },

  clearInput() {
    this.setData({ keyword: '', searched: false, list: [], categoryId: 0 })
  },

  clearHistory() {
    wx.setStorageSync(HIST_KEY, [])
    this.setData({ history: [] })
  },

  cancel() {
    wx.navigateBack({
      delta: 1,
      fail: () => wx.switchTab({ url: '/pages/index/index' }),
    })
  },
})
