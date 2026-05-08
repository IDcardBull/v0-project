// pages/checkout/checkout.js
// 提交订单（询价单）：写入云数据库 + 通知企业微信群
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
      const payload = {
        items: items.map((i) => ({
          productId: i.productId || null,
          skuId: i.skuId || null,
          name: i.productName,
          spec: i.skuSpec || '',
          image: i.skuImage || '',
          price: Number(i.unitPrice),
          qty: Number(i.qty),
        })),
        address: {
          contact: address.receiver || address.contact,
          phone: address.phone,
          province: address.province,
          city: address.city,
          district: address.district || '',
          detail: address.detail,
        },
        remark,
        user: {
          nickname:
            (app.globalData.userInfo && app.globalData.userInfo.nickname) || '',
          phone:
            (app.globalData.userInfo && app.globalData.userInfo.phone) || '',
        },
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
