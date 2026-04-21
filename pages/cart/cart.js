const { getTierPrice, getProductById } = require('../../utils/products.js')
const { formatMoney } = require('../../utils/util.js')

Page({
  data: {
    list: [],
    editing: false,
    totalQty: 0,
    allChecked: true,
    checkedCount: 0,
    checkedAmount: '0.00'
  },

  onShow() {
    this.refresh()
  },

  refresh() {
    const app = getApp()
    const cart = (app.globalData.cart || []).map(it => {
      // 用当前数量重新算单价（对应阶梯价）
      const product = getProductById(it.id)
      const price = product ? getTierPrice(product, it.qty) : it.price
      const lineTotal = formatMoney(price * it.qty)
      return { ...it, price, lineTotal, checked: it.checked !== false }
    })
    const totalQty = cart.reduce((s, i) => s + i.qty, 0)
    const checkedList = cart.filter(i => i.checked)
    const checkedCount = checkedList.reduce((s, i) => s + i.qty, 0)
    const checkedAmount = formatMoney(
      checkedList.reduce((s, i) => s + i.qty * i.price, 0)
    )
    const allChecked = cart.length > 0 && cart.every(i => i.checked)
    this.setData({
      list: cart, totalQty, checkedCount, checkedAmount, allChecked
    })
  },

  toggleEdit() {
    this.setData({ editing: !this.data.editing })
  },

  toggleCheck(e) {
    const id = e.currentTarget.dataset.id
    const list = this.data.list.map(it =>
      it.id === id ? { ...it, checked: !it.checked } : it
    )
    this._writeBack(list)
  },

  toggleAll() {
    const all = !this.data.allChecked
    const list = this.data.list.map(it => ({ ...it, checked: all }))
    this._writeBack(list)
  },

  _writeBack(list) {
    const app = getApp()
    app.globalData.cart = list.map(({ checked, lineTotal, ...rest }) => ({ ...rest, checked }))
    wx.setStorageSync('cart', app.globalData.cart)
    this.refresh()
  },

  onQtyChange(e) {
    const id = e.currentTarget.dataset.id
    const qty = e.detail.value
    const app = getApp()
    if (qty <= 0) {
      app.removeFromCart(id)
    } else {
      const product = getProductById(id)
      const price = product ? getTierPrice(product, qty) : 0
      const old = (app.globalData.cart || []).find(c => c.id === id) || {}
      app.upsertCart({ ...old, id, qty, price })
    }
    this.refresh()
  },

  removeChecked() {
    const app = getApp()
    const remain = this.data.list.filter(i => !i.checked).map(({ checked, lineTotal, ...rest }) => rest)
    app.globalData.cart = remain
    wx.setStorageSync('cart', remain)
    app.refreshTabBadge()
    this.refresh()
  },

  checkout() {
    if (this.data.checkedCount === 0) {
      return wx.showToast({ title: '请先勾选商品', icon: 'none' })
    }
    const items = this.data.list.filter(i => i.checked)
    wx.setStorageSync('checkoutItems', items)
    wx.navigateTo({ url: '/pages/order-detail/order-detail?mode=new' })
  },

  goDetail(e) {
    wx.navigateTo({ url: `/pages/detail/detail?id=${e.currentTarget.dataset.id}` })
  },

  goIndex() {
    wx.switchTab({ url: '/pages/index/index' })
  }
})
