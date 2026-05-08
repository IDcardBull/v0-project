// pages/orders/orders.js
const api = require('../../utils/api.js')
const { formatPrice, statusText, statusColor } = require('../../utils/util.js')

const TABS = [
  { id: '',          name: '全部' },
  { id: 'pending',   name: '待确认' },
  { id: 'shipping',  name: '待发货' },
  { id: 'completed', name: '已完成' },
  { id: 'cancelled', name: '已取消' },
]

const PAGE_SIZE = 10

Page({
  data: {
    tabs: TABS,
    activeTab: '',
    list: [],
    page: 1,
    hasMore: true,
    loading: false,
    initialLoading: true,
  },

  onLoad(options = {}) {
    if (options.status) {
      this.setData({ activeTab: options.status })
    }
  },

  onShow() {
    // 从详情页返回时刷新
    this.refresh()
  },

  onPullDownRefresh() {
    this.refresh().finally(() => wx.stopPullDownRefresh())
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) this.loadMore()
  },

  switchTab(e) {
    const id = e.currentTarget.dataset.id
    if (id === this.data.activeTab) return
    this.setData({ activeTab: id }, () => this.refresh())
  },

  async refresh() {
    this.setData({ page: 1, hasMore: true, list: [], loading: true })
    try {
      const res = await this.fetchPage(1)
      const list = (res && res.list) || []
      const total = (res && res.total) || list.length
      this.setData({
        list: this.format(list),
        hasMore: list.length >= PAGE_SIZE && list.length < total,
        page: 1,
        initialLoading: false,
      })
    } catch (e) {
      this.setData({ initialLoading: false })
    } finally {
      this.setData({ loading: false })
    }
  },

  async loadMore() {
    if (this.data.loading || !this.data.hasMore) return
    this.setData({ loading: true })
    try {
      const next = this.data.page + 1
      const res = await this.fetchPage(next)
      const list = (res && res.list) || []
      const total = (res && res.total) || 0
      const merged = this.data.list.concat(this.format(list))
      this.setData({
        list: merged,
        page: next,
        hasMore: merged.length < total,
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  fetchPage(page) {
    const params = { page, pageSize: PAGE_SIZE }
    if (this.data.activeTab) params.status = this.data.activeTab
    return api.order.list(params)
  },

  format(list) {
    return list.map((o) => ({
      ...o,
      id: o.id || o._id,
      statusText: statusText(o.status),
      statusColor: statusColor(o.status),
      totalAmountText: formatPrice(o.totalAmount),
      itemsPreview: (o.items || []).slice(0, 3).map((it) => ({
        ...it,
        priceText: formatPrice(it.price),
      })),
      moreCount: (o.items || []).length > 3 ? (o.items || []).length - 3 : 0,
      totalQty: (o.items || []).reduce((s, i) => s + (i.qty || 0), 0),
    }))
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/order-detail/order-detail?id=${id}` })
  },

  // 取消订单
  async cancelOrder(e) {
    e.stopPropagation && e.stopPropagation()
    const id = e.currentTarget.dataset.id
    const { confirm } = await wx.showModal({ title: '提示', content: '确认取消该订单？' })
    if (!confirm) return
    try {
      await api.order.cancel(id)
      wx.showToast({ title: '已取消', icon: 'success' })
      this.refresh()
    } catch (err) {}
  },

  // 确认收货
  async confirmReceive(e) {
    e.stopPropagation && e.stopPropagation()
    const id = e.currentTarget.dataset.id
    const { confirm } = await wx.showModal({ title: '提示', content: '确认已收到货？' })
    if (!confirm) return
    try {
      await api.order.confirm(id)
      wx.showToast({ title: '已确认', icon: 'success' })
      this.refresh()
    } catch (err) {}
  },
})
