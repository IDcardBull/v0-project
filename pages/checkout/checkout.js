// pages/checkout/checkout.js
const api = require('../../utils/api.js')
const cartStore = require('../../utils/cart.js')
const { formatPrice, toIdStr } = require('../../utils/util.js')
const app = getApp()

Page({
  data: {
    from: 'cart',           // 'cart' | 'buynow'
    items: [],              // 待结算商品
    address: null,          // 收货地址
    addressLoading: true,
    remark: '',
    goodsAmount: '0.00',
    freight: '0.00',
    totalAmount: '0.00',
    submitting: false,
  },

  onLoad(options) {
    const from = options.from || 'cart'
    this.setData({ from })
    this.loadItems()
  },

  onShow() {
    this.loadDefaultAddress()
  },

  // 加载商品（从 buyNow payload 或购物车选中项）
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
      wx.showToast({ title: '没有可结算的商品', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 800)
      return
    }

    const goodsAmount = items.reduce((s, i) => s + Number(i.unitPrice) * Number(i.qty), 0)
    const freight = 0 // 后端目前未提供运费计算接口，先按 0 展示
    const total = goodsAmount + freight

    this.setData({
      items: items.map((i) => ({
        ...i,
        lineTotal: formatPrice(i.unitPrice * i.qty),
      })),
      goodsAmount: formatPrice(goodsAmount),
      freight: formatPrice(freight),
      totalAmount: formatPrice(total),
    })
  },

  async loadDefaultAddress() {
    if (!app.isLogin()) return
    try {
      this.setData({ addressLoading: true })
      const list = await api.address.list()
      const def = (list || []).find((a) => a.isDefault) || (list && list[0]) || null
      this.setData({ address: def })
    } catch (e) {
      // ignore
    } finally {
      this.setData({ addressLoading: false })
    }
  },

  // 选择 / 编辑地址
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

  // 提交订单 -> 调起微信支付
  async submit() {
    const { address, items, remark, submitting } = this.data
    if (submitting) return
    if (!address) {
      wx.showToast({ title: '请选择收货地址', icon: 'none' })
      return
    }
    if (!items.length) return

    this.setData({ submitting: true })
    wx.showLoading({ title: '提交订单...', mask: true })

    try {
      const order = await api.order.create({
        items: items.map((i) => ({ skuId: Number(i.skuId), qty: Number(i.qty) })),
        addressId: Number(address.id),
        remark: remark || '',
      })

      wx.hideLoading()
      // 下单成功后立即清理购物车里的对应项（仅购物车下单）
      if (this.data.from === 'cart') {
        cartStore.removeMany(items.map((i) => i.skuId))
        app.refreshCartBadge()
      } else {
        app.globalData.buyNowPayload = null
      }

      // 调起支付
      await this.payOrder(order.id)
    } catch (e) {
      wx.hideLoading()
      // 已 toast
    } finally {
      this.setData({ submitting: false })
    }
  },

  async payOrder(orderId) {
    try {
      wx.showLoading({ title: '调起支付...', mask: true })
      const params = await api.pay.requestPayParams(orderId)
      wx.hideLoading()
      wx.requestPayment({
        timeStamp: params.timeStamp,
        nonceStr: params.nonceStr,
        package: params.package,
        signType: params.signType || 'RSA',
        paySign: params.paySign,
        success: () => {
          wx.redirectTo({ url: `/pages/pay-result/pay-result?orderId=${toIdStr(orderId)}&status=success` })
        },
        fail: () => {
          // 用户取消或失败：仍然跳到结果页（让用户继续支付或查看订单）
          wx.redirectTo({ url: `/pages/pay-result/pay-result?orderId=${toIdStr(orderId)}&status=cancel` })
        },
      })
    } catch (e) {
      wx.hideLoading()
      // 支付参数获取失败：跳到订单详情，让用户后续手动支付
      wx.redirectTo({ url: `/pages/order-detail/order-detail?id=${toIdStr(orderId)}` })
    }
  },
})
