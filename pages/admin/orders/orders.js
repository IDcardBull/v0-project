// pages/admin/orders/orders.js
const app = getApp()
const api = require('../../../utils/api.js')
const { pickList, normalizeOrder } = require('../../../utils/admin-format.js')

const TABS = [
  { key: '', label: '全部' },
  { key: 'pending_pay', label: '待付' },
  { key: 'pending_ship', label: '待发' },
  { key: 'shipped', label: '在途' },
  { key: 'completed', label: '已成' },
]

const PAGE_SIZE = 20

Page({
  data: {
    tabs: TABS,
    status: '',
    keyword: '',
    list: [],
    page: 1,
    total: 0,
    counts: {},
    loading: true,
    loadingMore: false,
    finished: false,
    empty: false,
  },
  onLoad(options) {
    this.setData({ status: options.status || '' })
  },
  onShow() {
    if (!app.isAdmin()) {
      wx.redirectTo({ url: '/pages/admin/login/login' })
      return
    }
    this.refresh()
    this.fetchCounts()
  },
  onPullDownRefresh() { this.refresh().finally(() => wx.stopPullDownRefresh()) },
  onReachBottom() {
    if (this.data.finished || this.data.loadingMore) return
    this.fetch(this.data.page + 1)
  },

  fetchCounts() {
    api.admin.order.counts().then((counts) => {
      if (counts) this.setData({ counts: Object.assign({}, this.data.counts, counts) })
    }).catch(() => {})
  },

  refresh() { return this.fetch(1) },
  fetch(page) {
    const isFirst = page === 1
    this.setData(isFirst ? { loading: true } : { loadingMore: true })
    const params = { page, pageSize: PAGE_SIZE }
    if (this.data.status) params.status = this.data.status
    if (this.data.keyword) params.orderNo = this.data.keyword
    return api.admin.order.list(params).then((res) => {
      const records = pickList(res)
      const list = records.map(normalizeOrder)
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

  switchTab(e) {
    const status = e.currentTarget.dataset.status
    if (status === this.data.status) return
    this.setData({ status })
    this.refresh()
  },
  onKeyword(e) { this.setData({ keyword: e.detail.value }) },
  onSearch() { this.refresh() },
  goDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/admin/order-detail/order-detail?id=${id}` })
  },
})
