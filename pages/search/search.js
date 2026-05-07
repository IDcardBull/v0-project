// pages/search/search.js
const api = require('../../utils/api.js')
const app = getApp()

const HIST_KEY = 'searchHistory'
const PAGE_SIZE = 10

Page({
  data: {
    keyword: '',
    history: [],
    hotKeywords: [],
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
    this.loadHotKeywords()
  },

  onShow() {
    this.setData({ history: wx.getStorageSync(HIST_KEY) || [] })
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) this.loadMore()
  },

  // 热搜词加载策略：
  // 1) 优先用站点配置 siteConfig.hotKeywords
  // 2) 降级使用一级分类名称（最多 8 个）
  // 3) 仍无则不展示热搜区
  async loadHotKeywords() {
    const cfg = app.getSiteConfig()
    if (cfg.hotKeywords && cfg.hotKeywords.length) {
      this.setData({ hotKeywords: cfg.hotKeywords.slice(0, 10) })
      return
    }
    try {
      const tree = await api.product.categoriesTree()
      const names = (tree || [])
        .map((c) => c && c.name)
        .filter(Boolean)
        .slice(0, 8)
      this.setData({ hotKeywords: names })
    } catch (e) {
      // 静默
    }
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
      const list = res.list || res.items || []
      const total = res.total || res.totalCount || list.length
      this.setData({
        list,
        hasMore: list.length >= PAGE_SIZE && list.length < total,
      })
    } catch (e) {} finally {
      this.setData({ loading: false })
    }
  },

  async loadMore() {
    this.setData({ loading: true })
    try {
      const next = this.data.page + 1
      const res = await this.fetch(next)
      const more = res.list || res.items || []
      const total = res.total || res.totalCount || (this.data.list.length + more.length)
      const merged = this.data.list.concat(more)
      this.setData({ list: merged, page: next, hasMore: merged.length < total })
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
