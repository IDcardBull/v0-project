const { getTierPrice } = require('../../utils/products.js')

Component({
  options: { multipleSlots: true },

  properties: {
    product: { type: Object, value: {} },
    qty: { type: Number, value: 0 }
  },

  computed: {},

  observers: {
    'product, qty': function (product, qty) {
      if (!product || !product.tiers) return
      const useQty = qty > 0 ? qty : (product.minOrderQty || 1)
      this.setData({
        currentPrice: getTierPrice(product, useQty)
      })
    }
  },

  data: {
    currentPrice: 0
  },

  methods: {
    onCardTap() {
      const id = this.data.product && this.data.product.id
      if (!id) return
      wx.navigateTo({ url: `/pages/detail/detail?id=${id}` })
    },
    stopTap() { /* 阻止冒泡 */ },
    onAddTap() {
      const p = this.data.product
      const app = getApp()
      const qty = p.minOrderQty || 1
      app.upsertCart({
        id: p.id,
        name: p.name,
        image: p.image,
        unit: p.unit,
        qty,
        price: getTierPrice(p, qty)
      })
      this.triggerEvent('change', { id: p.id, qty })
      wx.showToast({ title: `已加入 ${qty} ${p.unit}`, icon: 'none' })
    },
    onQtyChange(e) {
      const newQty = e.detail.value
      const p = this.data.product
      const app = getApp()
      app.upsertCart({
        id: p.id,
        name: p.name,
        image: p.image,
        unit: p.unit,
        qty: newQty,
        price: getTierPrice(p, newQty)
      })
      this.triggerEvent('change', { id: p.id, qty: newQty })
    }
  }
})
