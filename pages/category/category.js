// pages/category/category.js
const api = require('../../utils/api.js')
const { formatPrice } = require('../../utils/util.js')

Page({
  data: {
    tree: [],            // 完整分类树
    activeCat: 0,        // 当前选中的一级分类 id
    activeCatName: '',
    subCats: [],         // 当前一级下的二级分类
    recList: [],         // 子分类商品列表
    loading: false,
  },

  onLoad() {
    this.bootstrap()
  },

  async bootstrap() {
    try {
      this.setData({ loading: true })
      const tree = await api.product.categoriesTree()
      const top = (tree || []).filter((n) => !n.parentId)
      this.setData({ tree })
      if (top.length > 0) {
        await this.selectCategory(top[0])
      }
    } catch (e) {
      // ignore
    } finally {
      this.setData({ loading: false })
    }
  },

  async selectCategory(node) {
    const subCats = (node.children || []).map((c) => ({
      id: c.id,
      name: c.name,
      icon: c.icon || (c.name && c.name.charAt(0)) || '·',
    }))
    this.setData({
      activeCat: node.id,
      activeCatName: node.name + '精选',
      subCats,
      recList: [],
    })
    // 取该分类下的热销前 6 件
    try {
      const res = await api.product.list({
        categoryId: node.id,
        sort: 'sales',
        page: 1,
        pageSize: 6,
      })
      const list = (res.list || []).map((p) => ({
        id: p.id,
        name: p.name,
        image: p.mainImage,
        price: formatPrice(p.retailPrice),
      }))
      this.setData({ recList: list })
    } catch (e) {
      // ignore
    }
  },

  onCatTap(e) {
    const id = Number(e.currentTarget.dataset.id)
    if (id === this.data.activeCat) return
    const node = (this.data.tree || []).find((n) => n.id === id)
    if (node) this.selectCategory(node)
  },

  onSubCatTap(e) {
    const id = e.currentTarget.dataset.id
    // 跳到搜索页（用 categoryId 参数过滤）
    wx.navigateTo({ url: `/pages/search/search?categoryId=${id}` })
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}` })
  },

  goSearch() {
    wx.navigateTo({ url: '/pages/search/search' })
  },
})
