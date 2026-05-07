// pages/orders/orders.js
const api = require('../../utils/api.js')
const {
  formatPrice,
  statusText,
  statusColor,
  normalizeOrderStatus,
  isOrderStatus,
} = require('../../utils/util.js')
const { USE_FAKE_PAY, requestPayment, getDisplayOrderStatus, markOrderFakePaid } = require('../../utils/pay.js')

const TABS = [
  { id: '',          name: '全部' },
  { id: 'pending',   name: '待付款' },
  { id: 'paid',      name: '待发货' },
  { id: 'shipped',   name: '待收货' },
  { id: 'completed', name: '已完成' },
]

const STATUS_QUERY_MAP = {
  pending: 'pending_pay',
  paid: 'pending_ship',
  shipped: 'shipped',
  completed: 'completed',
}

function getOrderList(res) {
  if (Array.isArray(res)) return res
  return (res && (res.list || res.items || res.records || res.data)) || []
}

function getOrderTotal(res, fallback) {
  if (!res || Array.isArray(res)) return fallback
  return Number(res.total || res.totalCount || res.count || fallback) || 0
}

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
      const rawList = getOrderList(res)
      const total = getOrderTotal(res, rawList.length)
      this.setData({
        list: this.format(rawList),
        hasMore: rawList.length >= PAGE_SIZE && rawList.length < total,
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
      const rawList = getOrderList(res)
      const total = getOrderTotal(res, this.data.list.length + rawList.length)
      const merged = this.data.list.concat(this.format(rawList))
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
    if (this.data.activeTab) params.status = STATUS_QUERY_MAP[this.data.activeTab] || this.data.activeTab
    return api.order.list(params)
  },

  format(list) {
    return list.map((o) => {
      const displayStatus = getDisplayOrderStatus(o)
      const normalizedStatus = normalizeOrderStatus(displayStatus)
      const items = o.items || o.orderItems || o.goods || []
      return {
        ...o,
        status: displayStatus,
        id: o.id || o.orderId,
        normalizedStatus,
        isPendingPay: isOrderStatus(displayStatus, 'pending'),
        isShipped: isOrderStatus(displayStatus, 'shipped'),
        statusText: statusText(displayStatus),
        statusColor: statusColor(displayStatus),
        totalAmountText: formatPrice(o.totalAmount || o.payAmount || o.amount),
        itemsPreview: items.slice(0, 3).map((it) => ({
          ...it,
          name: it.name || it.productName || it.goodsName || '',
          image: it.image || it.productImage || it.skuImage || '',
          spec: it.spec || it.skuSpec || '',
          qty: it.qty || it.quantity || 0,
          priceText: formatPrice(it.price || it.unitPrice || it.salePrice),
        })),
        moreCount: items.length > 3 ? items.length - 3 : 0,
        totalQty: items.reduce((s, i) => s + (Number(i.qty || i.quantity) || 0), 0),
      }
    })
  },

  noop() {},

  goDetail(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    wx.navigateTo({ url: `/pages/order-detail/order-detail?id=${id}` })
  },

  // 直接付款（待付款）
  async payNow(e) {
    e.stopPropagation && e.stopPropagation()
    const id = e.currentTarget.dataset.id
    try {
      wx.showLoading({ title: USE_FAKE_PAY ? '模拟支付' : '调起支付', mask: true })
      const params = USE_FAKE_PAY ? {} : await api.order.repay(id)
      wx.hideLoading()
      await requestPayment(params, id)
      if (USE_FAKE_PAY) markOrderFakePaid(id)
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
