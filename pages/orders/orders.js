// pages/orders/orders.js
const api = require('../../utils/api.js')
const { formatPrice, statusText, statusColor } = require('../../utils/util.js')

const TABS = [
  { id: '',          name: '全部' },
  { id: 'pending',   name: '待付款' },
  { id: 'paid',      name: '待发货' },
  { id: 'shipped',   name: '待收货' },
  { id: 'completed', name: '已完成' },
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
      this.setData({
        list: this.format(res.list || []),
        hasMore: (res.list || []).length >= PAGE_SIZE && (res.list || []).length < (res.total || 0),
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
      const merged = this.data.list.concat(this.format(res.list || []))
      this.setData({
        list: merged,
        page: next,
        hasMore: merged.length < (res.total || 0),
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

  // 直接付款（待付款）
  async payNow(e) {
    e.stopPropagation && e.stopPropagation()
    const id = e.currentTarget.dataset.id
    try {
      wx.showLoading({ title: '调起支付', mask: true })
      const params = await api.order.repay(id)
      wx.hideLoading()
      await wx.requestPayment({
        timeStamp: params.timeStamp,
        nonceStr: params.nonceStr,
        package: params.package,
        signType: params.signType || 'RSA',
        paySign: params.paySign,
      })
      wx.showToast({ title: '支付成功', icon: 'success' })
      this.refresh()
    } catch (err) {
      wx.hideLoading()
      if (err && err.errMsg && err.errMsg.includes('cancel')) {
        wx.showToast({ title: '已取消支付', icon: 'none' })
      }
    }
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
