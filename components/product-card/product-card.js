// components/product-card/product-card.js
// 列表卡片：纯展示 + 跳详情。批发的 SKU 选择 / 阶梯价 / 加入采购单全部在详情页完成。
const {
  formatPrice,
  getBasePrice,
  normalizePriceTiers,
} = require('../../utils/util.js')

// 取卡片显示价：优先用后端聚合 tierMinPrice / tierMaxPrice
// 其次扫描 skus[].priceTiers[0].price，最后兜底到商品零售价
function pickCardPrice(p) {
  if (p && p.tierMinPrice != null && Number(p.tierMinPrice) > 0) {
    return Number(p.tierMinPrice)
  }
  if (Array.isArray(p && p.skus)) {
    for (const sku of p.skus) {
      const tiers = normalizePriceTiers(sku)
      if (tiers.length) return tiers[0].price
    }
  }
  const productTiers = normalizePriceTiers(p)
  if (productTiers.length) return productTiers[0].price
  return getBasePrice(p)
}

Component({
  properties: {
    product: { type: Object, value: {} },
    // 是否横排 list 风格（默认 true）。预留 grid 风格。
    layout: { type: String, value: 'list' },
  },

  data: {
    priceText: '0.00',
    salesText: '',
    coverUrl: '',
    tagText: '',
  },

  observers: {
    product(p) {
      if (!p) return
      const price = pickCardPrice(p)
      const sales = p.salesCount > 0 ? `已售 ${p.salesCount}` : '暂无销量'
      const tag = (p.tags && p.tags[0]) || ''
      this.setData({
        priceText: formatPrice(price),
        salesText: sales,
        coverUrl: p.mainImage || '',
        tagText: tag,
      })
    },
  },

  methods: {
    onCardTap() {
      const id = this.data.product && this.data.product.id
      if (!id) return
      wx.navigateTo({ url: `/pages/detail/detail?id=${id}` })
    },
  },
})
