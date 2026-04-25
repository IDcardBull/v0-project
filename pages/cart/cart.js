// pages/cart/cart.js
const cartStore = require('../../utils/cart.js')
const { formatPrice } = require('../../utils/util.js')
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
    this.refresh()
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

  checkout() {
    if (!app.ensureLogin()) return
    const selected = cartStore.selectedItems()
    if (selected.length === 0) {
      wx.showToast({ title: '请先勾选商品', icon: 'none' })
      return
    }
    app.globalData.buyNowPayload = null
    wx.navigateTo({ url: '/pages/checkout/checkout?from=cart' })
  },
})
