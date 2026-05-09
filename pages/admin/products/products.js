// pages/admin/products/products.js
const app = getApp()
const api = require('../../../utils/api.js')
const { pickList, normalizeProduct } = require('../../../utils/admin-format.js')

const PAGE_SIZE = 20

Page({
  data: {
    keyword: '',
    list: [],
    page: 1,
    total: 0,
    loading: true,
    loadingMore: false,
    finished: false,
    empty: false,
  },
  onShow() {
    if (!app.isAdmin()) {
      wx.redirectTo({ url: '/pages/admin/login/login' })
      return
    }
    this.refresh()
  },
  onPullDownRefresh() { this.refresh().finally(() => wx.stopPullDownRefresh()) },
  onReachBottom() {
    if (this.data.finished || this.data.loadingMore) return
    this.fetch(this.data.page + 1)
  },
  refresh() { return this.fetch(1) },
  fetch(page) {
    const isFirst = page === 1
    this.setData(isFirst ? { loading: true } : { loadingMore: true })
    const params = { page, pageSize: PAGE_SIZE }
    if (this.data.keyword) params.keyword = this.data.keyword
    return api.admin.product.list(params).then((res) => {
      const records = pickList(res)
      const list = records.map(normalizeProduct)
      const total = Number(res && (res.total || res.count || list.length)) || list.length
      const merged = isFirst ? list : this.data.list.concat(list)
      this.setData({
        list: merged,
        page,
        total,
        finished: merged.length >= total || list.length === 0,
        loading: false,
        loadingMore: false,
        empty: merged.length === 0,
      })
    }).catch(() => this.setData({
      loading: false,
      loadingMore: false,
      empty: this.data.list.length === 0,
    }))
  },
  onKeyword(e) { this.setData({ keyword: e.detail.value }) },
  onSearch() { this.refresh() },
  scanSearch() {
    wx.scanCode({
      onlyFromCamera: false,
      success: (res) => {
        this.setData({ keyword: res.result || '' })
        this.refresh()
      },
      fail: () => {},
    })
  },
  // toggleListing / toggleWholesale 已移到详情页（product-edit）统一管理。
  // 列表页保持只读视图 + 整张卡片点击进入详情，避免误触造成下架/隐藏。
  goEdit(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/admin/product-edit/product-edit?id=${id}` })
  },
})
