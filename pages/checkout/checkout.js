// pages/checkout/checkout.js
const api = require('../../utils/api.js')
const cartStore = require('../../utils/cart.js')
const {
  formatPrice,
  toIdStr,
  getBasePrice,
  getSkuPriceTiers,
  pickTierPrice,
} = require('../../utils/util.js')
const { isProductVisible, orderChannelPayload } = require('../../utils/channel.js')
const { USE_FAKE_PAY, requestPayment, markOrderFakePaid } = require('../../utils/pay.js')
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
        retailEnabled: i.retailEnabled === true,
        wholesaleEnabled: i.wholesaleEnabled === true,
        qty: Number(i.qty),
      }))
    }

    if (!items.length) {
      wx.showToast({ title: '没有可结算的商品', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 800)
      return
    }

    const goodsAmount = items.reduce((s, i) => s + Number(i.unitPrice) * Number(i.qty), 0)
    // 运费策略：
    // - 后端尚未提供 /client/orders/preview 接口，前端按站点配置「满 X 包邮」推算
    // - threshold = 0 表示全场包邮
    // - 真实下单金额以后端为准（订单详情会回填 shippingFee）
    const cfg = app.getSiteConfig()
    const threshold = Number(cfg.freeShippingThreshold) || 0
    const flatFee = Number(cfg.flatShippingFee) || 0
    const freight = threshold === 0 || goodsAmount >= threshold ? 0 : flatFee
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

  async validateItems(items) {
    const invalidSkuIds = []
    for (const item of items) {
      try {
        const product = await api.product.detail(item.productId)
        if (!isProductVisible(product)) invalidSkuIds.push(item.skuId)
      } catch (e) {
        invalidSkuIds.push(item.skuId)
      }
    }

    if (invalidSkuIds.length) {
      if (this.data.from === 'cart') {
        cartStore.removeMany(invalidSkuIds)
        app.refreshCartBadge()
      } else {
        app.globalData.buyNowPayload = null
      }
      wx.showToast({ title: '存在当前渠道不可购买商品', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 800)
      return false
    }
    return true
  },

  async refreshLatestItemPrices(items) {
    const next = []
    const invalidSkuIds = []

    for (const item of items) {
      try {
        const product = await api.product.detail(item.productId)
        if (!isProductVisible(product)) {
          invalidSkuIds.push(item.skuId)
          continue
        }
        const skus = product.skus || []
        const sku = skus.find((s) => Number(s.id) === Number(item.skuId)) || null
        const tiers = getSkuPriceTiers(sku, product)
        const basePrice = getBasePrice(sku || product)
        const unitPrice = pickTierPrice(item.qty, tiers, basePrice)
        next.push({
          ...item,
          productName: product.name || item.productName,
          skuImage: (sku && sku.image) || product.mainImage || item.skuImage,
          unitPrice,
          retailPrice: basePrice,
          priceTiers: tiers,
          retailEnabled: product.retailEnabled === true,
          wholesaleEnabled: product.wholesaleEnabled === true,
        })
      } catch (e) {
        invalidSkuIds.push(item.skuId)
      }
    }

    if (invalidSkuIds.length) {
      if (this.data.from === 'cart') cartStore.removeMany(invalidSkuIds)
      return []
    }

    return next
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
    const latestItems = await this.refreshLatestItemPrices(items)
    if (!latestItems.length) {
      wx.showToast({ title: '商品价格已变化，请重新结算', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 800)
      return
    }
    const valid = await this.validateItems(latestItems)
    if (!valid) return

    this.setData({ items: latestItems, submitting: true })
    wx.showLoading({ title: '提交订单...', mask: true })

    try {
      const order = await api.order.create(orderChannelPayload({
        items: latestItems.map((i) => ({ skuId: Number(i.skuId), qty: Number(i.qty) })),
        addressId: Number(address.id),
        remark: remark || '',
      }))

      wx.hideLoading()
      // 下单成功后立即清理购物车里的对应项（仅购物车下单）
      if (this.data.from === 'cart') {
        cartStore.removeMany(latestItems.map((i) => i.skuId))
        app.refreshCartBadge()
      } else {
        app.globalData.buyNowPayload = null
      }

      // 调起支付
      await this.payOrder(order.id || order.orderId)
    } catch (e) {
      wx.hideLoading()
      // 已 toast
    } finally {
      this.setData({ submitting: false })
    }
  },

  async payOrder(orderId) {
    try {
      wx.showLoading({ title: USE_FAKE_PAY ? '模拟支付...' : '调起支付...', mask: true })
      const params = USE_FAKE_PAY ? {} : await api.pay.requestPayParams(orderId)
      wx.hideLoading()
      await requestPayment(params, orderId)
      if (USE_FAKE_PAY) markOrderFakePaid(orderId)
      wx.redirectTo({ url: `/pages/pay-result/pay-result?orderId=${toIdStr(orderId)}&status=success${USE_FAKE_PAY ? '&fake=1' : ''}` })
    } catch (e) {
      wx.hideLoading()
      wx.redirectTo({ url: `/pages/pay-result/pay-result?orderId=${toIdStr(orderId)}&status=cancel` })
    }
  },
})
