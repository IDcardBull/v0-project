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
// 企微通知由服务端 WorkWxService 在 order.create 时主动推送（见 server/.env WORK_WX_BOT_WEBHOOK）。
// 客户端不再直接调 qyapi.weixin.qq.com（会被小程序合法域名白名单拦截）。
const app = getApp()

Page({
  data: {
    from: 'cart',           // B2B图册采购固定从采购单进入
    items: [],              // 待结算商品
    address: null,          // 收货地址
    addressLoading: true,
    remark: '',
    goodsAmount: '0.00',
    freight: '0.00',
    totalAmount: '0.00',
    submitting: false,
  },

  onLoad() {
    this.setData({ from: 'cart' })
    this.loadItems()
  },

  onShow() {
    this.loadDefaultAddress()
  },

  // 加载商品（固定从采购单选中项读取）
  loadItems() {
    const items = cartStore.selectedItems().map((i) => ({
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
      cartStore.removeMany(invalidSkuIds)
      app.refreshCartBadge()
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
          skuImage: (sku && (sku.image || sku.skuImage || sku.sku_image || sku.imageUrl || sku.image_url || sku.mainImage)) || item.skuImage || product.mainImage || '',
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
      cartStore.removeMany(invalidSkuIds)
      return []
    }

    return next
  },

  formatAddress(address) {
    if (!address) return ''
    return [address.province, address.city, address.district, address.detail || address.address]
      .filter(Boolean)
      .join('')
  },

  // 提交采购单：B2B 不调起微信支付，订单创建后服务端 WorkWxService 自动推送企微
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
    wx.showLoading({ title: '提交采购单...', mask: true })

    try {
      const order = await api.order.create(orderChannelPayload({
        items: latestItems.map((i) => ({ skuId: Number(i.skuId), qty: Number(i.qty) })),
        addressId: Number(address.id),
        remark: remark || '',
      }))

      wx.hideLoading()

      // 提交成功后立即清理购物车里的对应项
      cartStore.removeMany(latestItems.map((i) => i.skuId))
      app.refreshCartBadge()

      // 服务端会在订单创建后异步推送企微（不阻塞主流程，失败也不影响下单）
      wx.showModal({
        title: '采购单已提交',
        content: '客服已收到您的采购单，会尽快联系企业确认规格、数量、交期和结算方式。',
        showCancel: false,
        success: () => {
          wx.redirectTo({ url: `/pages/order-detail/order-detail?id=${toIdStr(order.id || order.orderId)}` })
        },
      })
    } catch (e) {
      wx.hideLoading()
      // 已 toast
    } finally {
      this.setData({ submitting: false })
    }
  },
})
