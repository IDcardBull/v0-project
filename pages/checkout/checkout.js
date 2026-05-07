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
const wecomBot = require('../../utils/wecom-bot.js')
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

  async sendWecomNotify(order, latestItems, address, remark) {
    try {
      const userInfo = wx.getStorageSync('userInfo') || {}
      const orderInfo = {
        orderNo: order.orderNo || order.order_no || order.id || order.orderId,
          customerName: address.contact || address.receiver || address.name || userInfo.nickname || '',
          customerPhone: address.phone || address.mobile || userInfo.phone || '',
          address: this.formatAddress(address),
        companyName: userInfo.companyName || userInfo.company || '',
          items: latestItems.map((i) => ({
          name: i.productName,
          skuSpec: i.skuSpec,
          skuImage: i.skuImage,
          qty: i.qty,
          price: i.unitPrice,
        })),
        subtotal: Number(this.data.goodsAmount || 0),
        freight: Number(this.data.freight || 0),
        total: Number(this.data.totalAmount || 0),
        remark: remark || '',
        time: new Date().toLocaleString(),
      }
      await wecomBot.submitPurchase(orderInfo)
      return true
    } catch (e) {
      console.warn('send wecom purchase notify failed:', e)
      return false
    }
  },

  // 提交采购单：B2B 不调起微信支付，提交后通知企业微信客服群
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

      const notified = await this.sendWecomNotify(order, latestItems, address, remark)
      wx.hideLoading()

      // 提交成功后立即清理购物车里的对应项
      cartStore.removeMany(latestItems.map((i) => i.skuId))
      app.refreshCartBadge()

      wx.showModal({
        title: '采购单已提交',
        content: notified
          ? '采购单已发送给客服，客服会尽快联系企业确认规格、数量、交期和结算方式。'
          : '采购单已生成，但企微机器人暂未配置或发送失败，请客服在后台查看订单并主动对接。',
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
