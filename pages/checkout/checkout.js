// pages/checkout/checkout.js
// 提交订单：调用后端 NestJS POST /client/orders
// 后端会根据 skuId+qty 重新计算金额、写入订单、并由后端 hook 触发企业微信群通知
const api = require('../../utils/api.js')
const cartStore = require('../../utils/cart.js')
const { formatPrice, toIdStr } = require('../../utils/util.js')
const app = getApp()

Page({
  data: {
    from: 'cart',           // 'cart' | 'buynow'
    items: [],
    address: null,
    addressLoading: true,
    remark: '',
    goodsAmount: '0.00',
    totalAmount: '0.00',
    submitting: false,
  },

  onLoad(options) {
    this.setData({ from: options.from || 'cart' })
    this.loadItems()
  },

  onShow() {
    this.loadDefaultAddress()
  },

  loadItems() {
    let items = []
    if (this.data.from === 'buynow') {
      const payload = app.globalData.buyNowPayload
      if (payload && payload.items) items = payload.items
    } else {
      items = cartStore.selectedItems().map((i) => ({
        skuId: i.skuId,
        productId: i.productId,
        productName: i.productName,
        skuSpec: i.skuSpec,
        skuImage: i.skuImage,
        unitPrice: Number(i.unitPrice),
        qty: Number(i.qty),
      }))
    }

    if (!items.length) {
      wx.showToast({ title: '没有可下单的商品', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 800)
      return
    }

    const goodsAmount = items.reduce(
      (s, i) => s + Number(i.unitPrice) * Number(i.qty),
      0,
    )

    this.setData({
      items: items.map((i) => ({
        ...i,
        lineTotal: formatPrice(i.unitPrice * i.qty),
      })),
      goodsAmount: formatPrice(goodsAmount),
      totalAmount: formatPrice(goodsAmount),
    })
  },

  async loadDefaultAddress() {
    if (!app.isLogin()) return
    try {
      this.setData({ addressLoading: true })
      const list = await api.address.list()
      const def =
        (list || []).find((a) => a.isDefault) || (list && list[0]) || null
      this.setData({ address: def })
    } catch (e) {
      // ignore
    } finally {
      this.setData({ addressLoading: false })
    }
  },

  goAddress() {
    const that = this
    wx.navigateTo({
      url: '/pages/address/address?picker=1',
      events: {
        addressSelected(addr) {
          that.setData({ address: addr })
        },
      },
    })
  },

  onRemarkInput(e) {
    this.setData({ remark: e.detail.value })
  },

  // 提交订单 -> 写入云数据库 + 触发企业微信群通知
  async submit() {
    const { address, items, remark, submitting } = this.data
    if (submitting) return
    if (!address) {
      wx.showToast({ title: '请选择收货地址', icon: 'none' })
      return
    }
    if (!items.length) return

    this.setData({ submitting: true })
    wx.showLoading({ title: '提交中…', mask: true })

    try {
      // 后端 CreateOrderDto 只接受 skuId + qty + addressId + remark
      // 商品名/规格/图片/价格由后端按 skuId 重新查表写入 orderItems（避免前端篡改）
      const payload = {
        items: items
          .filter((i) => i.skuId)
          .map((i) => ({ skuId: Number(i.skuId), qty: Number(i.qty) })),
        addressId: Number(address.id),
        remark: remark || undefined,
      }
      if (!payload.items.length) {
        wx.hideLoading()
        wx.showToast({ title: '商品信息缺失', icon: 'none' })
        this.setData({ submitting: false })
        return
      }

      const order = await api.order.create(payload)

      wx.hideLoading()

      // 清理购物车里的对应项
      if (this.data.from === 'cart') {
        cartStore.removeMany(items.map((i) => i.skuId))
        app.refreshCartBadge()
      } else {
        app.globalData.buyNowPayload = null
      }

      wx.showToast({ title: '提交成功', icon: 'success' })
      setTimeout(() => {
        wx.redirectTo({
          url: `/pages/order-detail/order-detail?id=${toIdStr(order.id)}&fromSubmit=1`,
        })
      }, 800)
    } catch (e) {
      wx.hideLoading()
      // 已 toast
    } finally {
      this.setData({ submitting: false })
    }
  },
})
