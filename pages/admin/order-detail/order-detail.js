// pages/admin/order-detail/order-detail.js
const app = getApp()
const api = require('../../../utils/api.js')
const { normalizeOrder, fmtMoney } = require('../../../utils/admin-format.js')

const SHIP_KEY = 'admin_last_ship_company'

const COMMON_COMPANIES = [
  '德邦快递',
  '顺丰速运',
  '京东物流',
  '安能物流',
  '百世快运',
  '中通快运',
  '专线物流',
]

Page({
  data: {
    id: null,
    order: null,
    loading: true,
    showShip: false,
    shipForm: { company: '', tracking: '', remark: '' },
    showPrice: false,
    priceForm: { amount: '', reason: '' },
    saving: false,
    companies: COMMON_COMPANIES,
  },
  onLoad(options) {
    const id = options.id || ''
    this.setData({ id })
  },
  onShow() {
    if (!app.isAdmin()) {
      wx.redirectTo({ url: '/pages/admin/login/login' })
      return
    }
    this.fetch()
  },

  fetch() {
    if (!this.data.id) return Promise.resolve()
    this.setData({ loading: true })
    return api.admin.order.detail(this.data.id).then((raw) => {
      this.setData({ order: normalizeOrder(raw), loading: false })
    }).catch(() => this.setData({ loading: false }))
  },

  // ---------- 发货 ----------
  openShip() {
    if (!this.data.order) return
    const last = wx.getStorageSync(SHIP_KEY) || ''
    this.setData({
      showShip: true,
      shipForm: { company: last || COMMON_COMPANIES[0], tracking: '', remark: '' },
    })
  },
  closeShip() { this.setData({ showShip: false }) },
  onCompany(e) { this.setData({ 'shipForm.company': COMMON_COMPANIES[e.detail.value] }) },
  onCompanyManual(e) { this.setData({ 'shipForm.company': e.detail.value }) },
  onTracking(e) { this.setData({ 'shipForm.tracking': e.detail.value }) },
  onRemark(e) { this.setData({ 'shipForm.remark': e.detail.value }) },
  scanTracking() {
    wx.scanCode({
      onlyFromCamera: false,
      success: (res) => this.setData({ 'shipForm.tracking': res.result || '' }),
      fail: () => {},
    })
  },
  async submitShip() {
    if (this.data.saving) return
    const { company, tracking, remark } = this.data.shipForm
    if (!company.trim()) return wx.showToast({ title: '请填写物流公司', icon: 'none' })
    if (!tracking.trim()) return wx.showToast({ title: '请填写物流单号', icon: 'none' })
    this.setData({ saving: true })
    try {
      await api.admin.order.ship(this.data.id, {
        logisticsCompany: company.trim(),
        company: company.trim(),
        trackingNumber: tracking.trim(),
        logisticsNo: tracking.trim(),
        remark: (remark || '').trim(),
      })
      wx.setStorageSync(SHIP_KEY, company.trim())
      wx.showToast({ title: '已发货', icon: 'none' })
      this.setData({ showShip: false, saving: false })
      this.fetch()
    } catch (e) {
      this.setData({ saving: false })
    }
  },

  // ---------- 改价 ----------
  openPrice() {
    if (!this.data.order) return
    if (this.data.order.statusKey !== 'pending_pay') {
      return wx.showToast({ title: '仅未付款订单可改价', icon: 'none' })
    }
    this.setData({
      showPrice: true,
      priceForm: { amount: this.data.order.total, reason: '' },
    })
  },
  closePrice() { this.setData({ showPrice: false }) },
  onAmount(e) { this.setData({ 'priceForm.amount': e.detail.value }) },
  onReason(e) { this.setData({ 'priceForm.reason': e.detail.value }) },
  async submitPrice() {
    if (this.data.saving) return
    const amount = Number(this.data.priceForm.amount)
    if (!Number.isFinite(amount) || amount < 0) {
      return wx.showToast({ title: '金额不合法', icon: 'none' })
    }
    this.setData({ saving: true })
    try {
      await api.admin.order.updateAmount(this.data.id, amount, this.data.priceForm.reason)
      wx.showToast({ title: '已改价', icon: 'none' })
      this.setData({ showPrice: false, saving: false })
      this.fetch()
    } catch (e) {
      this.setData({ saving: false })
    }
  },

  // ---------- 其他状态 ----------
  markPaid() {
    wx.showModal({
      title: '标记线下收款',
      content: '确认客户已通过线下完成付款？',
      success: ({ confirm }) => {
        if (!confirm) return
        api.admin.order.markPaid(this.data.id).then(() => {
          wx.showToast({ title: '已标记付款', icon: 'none' })
          this.fetch()
        }).catch(() => {})
      },
    })
  },
  complete() {
    wx.showModal({
      title: '标记完成',
      content: '客户已确认收货，标记订单完成？',
      success: ({ confirm }) => {
        if (!confirm) return
        api.admin.order.complete(this.data.id).then(() => {
          wx.showToast({ title: '已完成', icon: 'none' })
          this.fetch()
        }).catch(() => {})
      },
    })
  },
  closeOrder() {
    wx.showModal({
      title: '关闭订单',
      content: '关闭后客户无法再支付，确认？',
      editable: true,
      placeholderText: '可填写关闭原因',
      success: ({ confirm, content }) => {
        if (!confirm) return
        api.admin.order.close(this.data.id, content).then(() => {
          wx.showToast({ title: '已关闭', icon: 'none' })
          this.fetch()
        }).catch(() => {})
      },
    })
  },

  copyOrderNo() {
    if (!this.data.order) return
    wx.setClipboardData({ data: this.data.order.orderNo })
  },
  callUser() {
    const phone = this.data.order && this.data.order.user.phone
    if (!phone) return wx.showToast({ title: '无电话', icon: 'none' })
    wx.makePhoneCall({ phoneNumber: phone })
  },
})
