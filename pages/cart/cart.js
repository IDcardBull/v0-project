// pages/cart/cart.js
const api = require('../../utils/api.js')
const cartStore = require('../../utils/cart.js')
const {
  formatPrice,
  getBasePrice,
  getSkuPriceTiers,
  pickTierPrice,
} = require('../../utils/util.js')
const { isProductVisible } = require('../../utils/channel.js')
const app = getApp()

Page({
  data: {
    list: [],
    editing: false,
    totalQty: 0,
    allSelected: false,
    selectedCount: 0,
    selectedAmount: '0.00',
  },

  onShow() {
    this.refreshLatestPrices()
  },

  refresh() {
    const list = cartStore.getList().map((it) => ({
      ...it,
      lineTotal: formatPrice(Number(it.unitPrice) * Number(it.qty)),
    }))
    const selected = list.filter((i) => i.selected)
    const totalQty = list.reduce((s, i) => s + Number(i.qty), 0)
    const selAmount = selected.reduce((s, i) => s + Number(i.unitPrice) * Number(i.qty), 0)

    this.setData({
      list,
      totalQty,
      selectedCount: selected.reduce((s, i) => s + Number(i.qty), 0),
      selectedAmount: formatPrice(selAmount),
      allSelected: list.length > 0 && selected.length === list.length,
    })
    app.refreshCartBadge()
  },

  async refreshLatestPrices() {
    const list = cartStore.getList()
    const next = []

    for (const item of list) {
      try {
        const product = await api.product.detail(item.productId)
        if (!isProductVisible(product)) continue
        const skus = product.skus || []
        const sku = skus.find((s) => Number(s.id) === Number(item.skuId)) || null
        const tiers = getSkuPriceTiers(sku, product)
        const basePrice = getBasePrice(sku || product)
        const unitPrice = pickTierPrice(item.qty, tiers, basePrice)
        next.push({
          ...item,
          productName: product.name || item.productName,
          skuImage: (sku && sku.image) || product.mainImage || item.skuImage,
          retailPrice: basePrice,
          priceTiers: tiers,
          unitPrice,
          stock: sku && sku.stock != null ? sku.stock : item.stock,
          retailEnabled: product.retailEnabled === true,
          wholesaleEnabled: product.wholesaleEnabled === true,
        })
      } catch (e) {
        next.push(item)
      }
    }

    cartStore.save(next)
    this.refresh()
  },

  toggleEdit() {
    this.setData({ editing: !this.data.editing })
  },

  toggleSelect(e) {
    const skuId = e.currentTarget.dataset.skuid
    const item = this.data.list.find((i) => Number(i.skuId) === Number(skuId))
    if (!item) return
    cartStore.setSelected(skuId, !item.selected)
    this.refresh()
  },

  toggleAll() {
    cartStore.setAllSelected(!this.data.allSelected)
    this.refresh()
  },

  onQtyChange(e) {
    const skuId = e.currentTarget.dataset.skuid
    const qty = Math.max(1, Number(e.detail.value) || 1)
    cartStore.updateQty(skuId, qty)
    this.refresh()
  },

  goDetail(e) {
    const productId = e.currentTarget.dataset.pid
    if (productId) wx.navigateTo({ url: `/pages/detail/detail?id=${productId}` })
  },

  goIndex() {
    wx.switchTab({ url: '/pages/index/index' })
  },

  removeSelected() {
    const ids = cartStore.selectedItems().map((i) => i.skuId)
    if (ids.length === 0) {
      wx.showToast({ title: '请先勾选商品', icon: 'none' })
      return
    }
    wx.showModal({
      title: '提示',
      content: `确认删除 ${ids.length} 件商品？`,
      success: (r) => {
        if (r.confirm) {
          cartStore.removeMany(ids)
          this.refresh()
          wx.showToast({ title: '已删除', icon: 'success' })
        }
      },
    })
  },

  async validateSelectedItems(selected) {
    const invalidSkuIds = []
    for (const item of selected) {
      try {
        const product = await api.product.detail(item.productId)
        if (!isProductVisible(product)) invalidSkuIds.push(item.skuId)
      } catch (e) {
        invalidSkuIds.push(item.skuId)
      }
    }

    if (invalidSkuIds.length) {
      cartStore.removeMany(invalidSkuIds)
      this.refresh()
      wx.showToast({ title: '已移除当前渠道不可购买商品', icon: 'none' })
      return false
    }
    return true
  },

  async checkout() {
    if (!app.ensureLogin()) return
    const selected = cartStore.selectedItems()
    if (selected.length === 0) {
      wx.showToast({ title: '请先勾选商品', icon: 'none' })
      return
    }
    const ok = await this.validateSelectedItems(selected)
    if (!ok) return
    app.globalData.buyNowPayload = null
    wx.navigateTo({ url: '/pages/checkout/checkout?from=cart' })
  },
})
