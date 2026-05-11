// components/product-card/product-card.js
// 列表卡片：纯展示 + 跳详情。批发的 SKU 选择 / 阶梯价 / 加入采购单全部在详情页完成。
const {
  formatPrice,
  getBasePrice,
} = require('../../utils/util.js')

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
      const price = getBasePrice(p)
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
