// pages/admin/product-edit/product-edit.js
const app = getApp()
const api = require('../../../utils/api.js')
const { fmtMoney } = require('../../../utils/admin-format.js')

function fmtSpec(specs) {
  if (!specs) return ''
  if (typeof specs === 'string') {
    try { return Object.values(JSON.parse(specs)).join(' · ') } catch (e) { return specs }
  }
  if (typeof specs === 'object') return Object.values(specs).join(' · ')
  return ''
}

Page({
  data: {
    id: null,
    product: null,
    skus: [],
    loading: true,
    saving: {},        // 库存保存中
    savingPrice: {},   // 价格保存中
  },
  onLoad(options) { this.setData({ id: options.id || '' }) },
  onShow() {
    if (!app.isAdmin()) {
      wx.redirectTo({ url: '/pages/admin/login/login' })
      return
    }
    this.fetch()
  },
  fetch() {
    if (!this.data.id) return
    this.setData({ loading: true })
    Promise.all([
      api.admin.product.detail(this.data.id),
      api.admin.sku.listByProduct(this.data.id).catch(() => null),
    ]).then(([product, skuRes]) => {
      const rawSkus = (skuRes && (skuRes.list || skuRes.records || skuRes)) || product.skus || []
      const skus = (Array.isArray(rawSkus) ? rawSkus : []).map((s) => {
        // 后端 SKU 表只有 retailPrice / memberPrice；批发阶梯价由 priceTiers 表管理。
        // 这里改的是 retailPrice（基础售价），保存时也只发 retailPrice。
        const rawPrice = s.retailPrice != null ? s.retailPrice
          : (s.price != null ? s.price : (s.wholesalePrice != null ? s.wholesalePrice : 0))
        const numPrice = Number(rawPrice) || 0
        return {
          id: s.id,
          spec: fmtSpec(s.specs),
          code: s.skuCode || s.code || '',
          price: fmtMoney(rawPrice),     // 用于展示
          rawPrice: numPrice,            // 比对是否改动
          editingPrice: String(numPrice.toFixed(2)),
          stock: Number(s.stock || 0),
          editing: String(s.stock || 0),
        }
      })
      this.setData({
        product: {
          id: product.id,
          name: product.name || product.title || '',
          cover: product.cover || product.image || (product.images && product.images[0]) || '',
          status: product.status == null ? 1 : Number(product.status),
          wholesaleEnabled: product.wholesaleEnabled !== false,
        },
        skus,
        loading: false,
      })
    }).catch(() => this.setData({ loading: false }))
  },

  onStock(e) {
    const idx = e.currentTarget.dataset.idx
    this.setData({ [`skus[${idx}].editing`]: e.detail.value })
  },
  onPrice(e) {
    const idx = e.currentTarget.dataset.idx
    this.setData({ [`skus[${idx}].editingPrice`]: e.detail.value })
  },
  savePrice(e) {
    const idx = Number(e.currentTarget.dataset.idx)
    const sku = this.data.skus[idx]
    const next = Number(sku.editingPrice)
    if (!isFinite(next) || next < 0) {
      return wx.showToast({ title: '价格无效', icon: 'none' })
    }
    if (Math.abs(next - Number(sku.rawPrice)) < 0.001) {
      return wx.showToast({ title: '未改动', icon: 'none' })
    }
    this.setData({ [`savingPrice.${sku.id}`]: true })
    api.admin.sku.updatePrice(sku.id, { retailPrice: next }).then((res) => {
      const fresh = res && res.retailPrice != null ? Number(res.retailPrice) : next
      this.setData({
        [`skus[${idx}].rawPrice`]: fresh,
        [`skus[${idx}].price`]: fmtMoney(fresh),
        [`skus[${idx}].editingPrice`]: String(fresh.toFixed(2)),
        [`savingPrice.${sku.id}`]: false,
      })
      wx.showToast({ title: '价格已更新', icon: 'none' })
    }).catch((err) => {
      this.setData({ [`savingPrice.${sku.id}`]: false })
      wx.showToast({ title: (err && err.message) || '保存失败', icon: 'none' })
    })
  },
  step(e) {
    const idx = Number(e.currentTarget.dataset.idx)
    const delta = Number(e.currentTarget.dataset.delta)
    const sku = this.data.skus[idx]
    const next = Math.max(0, Number(sku.editing || 0) + delta)
    this.setData({ [`skus[${idx}].editing`]: String(next) })
  },
  scanLocate() {
    wx.scanCode({
      onlyFromCamera: false,
      success: (res) => {
        const code = (res.result || '').trim()
        const idx = this.data.skus.findIndex((s) => s.code === code)
        if (idx < 0) return wx.showToast({ title: '未匹配 SKU', icon: 'none' })
        wx.showToast({ title: `已定位：${this.data.skus[idx].spec || code}`, icon: 'none' })
        wx.pageScrollTo({ selector: `#sku-${this.data.skus[idx].id}`, duration: 300 })
      },
      fail: () => {},
    })
  },
  saveStock(e) {
    const idx = Number(e.currentTarget.dataset.idx)
    const sku = this.data.skus[idx]
    const next = Math.max(0, Number(sku.editing || 0))
    if (next === sku.stock) return wx.showToast({ title: '未改动', icon: 'none' })
    this.setData({ [`saving.${sku.id}`]: true })
    api.admin.sku.updateStock(sku.id, next).then(() => {
      this.setData({
        [`skus[${idx}].stock`]: next,
        [`skus[${idx}].editing`]: String(next),
        [`saving.${sku.id}`]: false,
      })
      wx.showToast({ title: '已更新', icon: 'none' })
    }).catch(() => this.setData({ [`saving.${sku.id}`]: false }))
  },
  toggleListing() {
    api.admin.product.toggleListing(this.data.id).then(() => {
      const cur = this.data.product.status
      this.setData({ 'product.status': cur === 1 ? 0 : 1 })
      wx.showToast({ title: cur === 1 ? '已下架' : '已上架', icon: 'none' })
    }).catch(() => {})
  },
  toggleWholesale() {
    api.admin.product.toggleWholesale(this.data.id).then(() => {
      this.setData({ 'product.wholesaleEnabled': !this.data.product.wholesaleEnabled })
      wx.showToast({ title: '已切换', icon: 'none' })
    }).catch(() => {})
  },
})
