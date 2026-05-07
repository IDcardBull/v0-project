// pages/detail/detail.js
const api = require('../../utils/api.js')
const cartStore = require('../../utils/cart.js')
const {
  formatPrice,
  pickTierPrice,
  getBasePrice,
  getSkuPriceTiers,
  getMinWholesaleQty,
} = require('../../utils/util.js')
const { isProductVisible } = require('../../utils/channel.js')

const app = getApp()

Page({
  data: {
    productId: 0,
    product: null,
    images: [],
    productImages: [],
    skus: [],
    skuMap: {},          // {规格名: [可选值]}
    selectedSpec: {},    // {规格名: 选中值}
    activeSku: null,
    activeSkuImage: '',
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
      if (!p || !isProductVisible(p)) {
        wx.showToast({ title: '商品不存在或已下架', icon: 'none' })
        setTimeout(() => wx.navigateBack(), 800)
        return
      }

      // 图片：商品基础图 + 当前 SKU 图。规格切换时会把选中 SKU 图置为轮播首图。
      const images = []
      const pushImage = (url) => {
        if (url && !images.includes(url)) images.push(url)
      }
      pushImage(p.mainImage)
      if (Array.isArray(p.images)) p.images.forEach(pushImage)

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

      const defaultTiers = getSkuPriceTiers(skus[0], p)
      const minQty = getMinWholesaleQty(p, defaultTiers)

      this.setData({
        product: p,
        images,
        productImages: images,
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

  getSkuImage(sku, product) {
    return (sku && (sku.image || sku.skuImage || sku.sku_image || sku.imageUrl || sku.image_url || sku.mainImage))
      || (product && (product.mainImage || (Array.isArray(product.images) && product.images[0])))
      || ''
  },

  buildDisplayImages(skuImage, baseImages) {
    const images = []
    const pushImage = (url) => {
      if (url && !images.includes(url)) images.push(url)
    }
    pushImage(skuImage)
    ;(baseImages || []).forEach(pushImage)
    return images
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

    const tiers = getSkuPriceTiers(matched, product)
    const fallbackPrice = matched ? getBasePrice(matched) : getBasePrice(product)
    const price = pickTierPrice(qty, tiers, fallbackPrice)
    const activeSkuImage = this.getSkuImage(matched, product)

    this.setData({
      activeSku: matched,
      activeSkuImage,
      images: this.buildDisplayImages(activeSkuImage, this.data.productImages),
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

  // ---- 图册采购：只加入采购单，统一到采购单页面提交 ----
  onAddTap() {
    this.addToCart()
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
    if (!isProductVisible(product)) {
      wx.showToast({ title: '商品不支持当前渠道购买', icon: 'none' })
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
      skuImage: this.getSkuImage(activeSku, product),
      retailPrice: getBasePrice(activeSku),
      memberPrice: activeSku.memberPrice ? Number(activeSku.memberPrice) : null,
      priceTiers: priceTiers,
      minWholesaleQty: minQty,
      stock: activeSku.stock,
      retailEnabled: product.retailEnabled === true,
      wholesaleEnabled: product.wholesaleEnabled === true,
      qty,
      unitPrice: Number(currentPrice),
    })

    app.refreshCartBadge()
    wx.showToast({ title: '已加入采购单', icon: 'success' })
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
