// pages/detail/detail.js
const api = require('../../utils/api.js')
const cartStore = require('../../utils/cart.js')
const { formatPrice, pickTierPrice } = require('../../utils/util.js')

const app = getApp()

Page({
  data: {
    productId: 0,
    product: null,
    images: [],
    skus: [],
    skuMap: {},          // {规格名: [可选值]}
    selectedSpec: {},    // {规格名: 选中值}
    activeSku: null,
    qty: 1,
    minQty: 1,
    currentPrice: '0.00',
    priceTiers: [],
    detailHtml: '',
    loading: true,
  },

  onLoad(opts) {
    const id = Number(opts.id)
    if (!id) {
      wx.showToast({ title: '商品不存在', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 800)
      return
    }
    this.setData({ productId: id })
    this.loadDetail()
  },

  onShow() {
    app.refreshCartBadge()
  },

  async loadDetail() {
    try {
      this.setData({ loading: true })
      const p = await api.product.detail(this.data.productId)
      if (!p) {
        wx.showToast({ title: '商品不存在', icon: 'none' })
        return
      }

      // 图片：mainImage + images 数组
      const images = []
      if (p.mainImage) images.push(p.mainImage)
      if (Array.isArray(p.images)) images.push(...p.images)

      // SKU 规格归类
      const skus = (p.skus || []).filter((s) => s.status === 1)
      const skuMap = {}
      skus.forEach((sku) => {
        const specs = sku.specs || {}
        Object.keys(specs).forEach((k) => {
          if (!skuMap[k]) skuMap[k] = []
          if (!skuMap[k].includes(specs[k])) skuMap[k].push(specs[k])
        })
      })

      const selectedSpec = {}
      Object.keys(skuMap).forEach((k) => {
        selectedSpec[k] = skuMap[k][0]
      })

      // 起批量
      const minQty = p.minWholesaleQty && p.minWholesaleQty > 0 ? p.minWholesaleQty : 1

      this.setData({
        product: p,
        images,
        skus,
        skuMap,
        selectedSpec,
        minQty,
        qty: minQty,
        detailHtml: p.detail || '',
      })
      this.matchSku()

      wx.setNavigationBarTitle({ title: (p.name || '商品详情').slice(0, 14) })
    } catch (e) {
      // 已 toast
    } finally {
      this.setData({ loading: false })
    }
  },

  // 根据当前 selectedSpec 匹配 SKU
  matchSku() {
    const { skus, selectedSpec, qty, product } = this.data
    let matched = null
    for (const sku of skus) {
      const specs = sku.specs || {}
      const ok = Object.keys(selectedSpec).every((k) => specs[k] === selectedSpec[k])
      if (ok) {
        matched = sku
        break
      }
    }
    // 如果没多 SKU，回退到第一个
    if (!matched && skus.length > 0) matched = skus[0]

    const tiers = (matched && matched.priceTiers) || []
    const fallbackPrice = matched ? matched.retailPrice : product && product.retailPrice
    const price = pickTierPrice(qty, tiers, fallbackPrice)

    this.setData({
      activeSku: matched,
      priceTiers: tiers,
      currentPrice: formatPrice(price),
    })
  },

  onSpecTap(e) {
    const { name, value } = e.currentTarget.dataset
    const next = { ...this.data.selectedSpec, [name]: value }
    this.setData({ selectedSpec: next }, () => this.matchSku())
  },

  onQtyChange(e) {
    const qty = Math.max(this.data.minQty, Number(e.detail.value) || this.data.minQty)
    this.setData({ qty }, () => this.matchSku())
  },

  // ---- 加入采购单 ----
  onAddTap() {
    this.addToCart()
  },
  onBuyTap() {
    this.buyNow()
  },

  addToCart() {
    const { activeSku, qty, minQty, product, priceTiers, currentPrice } = this.data
    if (!activeSku) {
      wx.showToast({ title: '请选择规格', icon: 'none' })
      return
    }
    if (qty < minQty) {
      wx.showToast({ title: `至少 ${minQty} 件起批`, icon: 'none' })
      return
    }
    if (activeSku.stock != null && qty > activeSku.stock) {
      wx.showToast({ title: '库存不足', icon: 'none' })
      return
    }

    const skuSpec = Object.entries(activeSku.specs || {})
      .map(([k, v]) => `${k}:${v}`)
      .join(' / ')

    cartStore.add({
      skuId: activeSku.id,
      productId: product.id,
      productName: product.name,
      skuSpec,
      skuImage: activeSku.image || product.mainImage,
      retailPrice: Number(activeSku.retailPrice),
      memberPrice: activeSku.memberPrice ? Number(activeSku.memberPrice) : null,
      priceTiers: priceTiers,
      minWholesaleQty: minQty,
      stock: activeSku.stock,
      qty,
      unitPrice: Number(currentPrice),
    })

    app.refreshCartBadge()
    wx.showToast({ title: '已加入采购单', icon: 'success' })
  },

  // ---- 立即购买 ----
  buyNow() {
    const { activeSku, qty, minQty, product, priceTiers, currentPrice } = this.data
    if (!app.ensureLogin()) return

    if (!activeSku) {
      wx.showToast({ title: '请选择规格', icon: 'none' })
      return
    }
    if (qty < minQty) {
      wx.showToast({ title: `至少 ${minQty} 件起批`, icon: 'none' })
      return
    }
    if (activeSku.stock != null && qty > activeSku.stock) {
      wx.showToast({ title: '库存不足', icon: 'none' })
      return
    }

    const skuSpec = Object.entries(activeSku.specs || {})
      .map(([k, v]) => `${k}:${v}`)
      .join(' / ')

    // 把单条立即购买的 payload 暂存到 globalData，避免 URL 过长
    app.globalData.buyNowPayload = {
      items: [
        {
          skuId: activeSku.id,
          productId: product.id,
          productName: product.name,
          skuSpec,
          skuImage: activeSku.image || product.mainImage,
          unitPrice: Number(currentPrice),
          qty,
        },
      ],
    }
    wx.navigateTo({ url: '/pages/checkout/checkout?from=buynow' })
  },

  callService() {
    app.callCustomerService()
  },

  goCart() {
    wx.switchTab({ url: '/pages/cart/cart' })
  },

  goHome() {
    wx.switchTab({ url: '/pages/index/index' })
  },
})
