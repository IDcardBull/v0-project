// pages/index/index.js
const api = require('../../utils/api.js')
const { filterVisibleProducts } = require('../../utils/channel.js')
const app = getApp()

const SORT_OPTIONS = [
  { id: 'new', name: '综合' },
  { id: 'sales', name: '销量' },
  { id: 'price_asc', name: '价格 ↑' },
  { id: 'price_desc', name: '价格 ↓' },
]

const PAGE_SIZE = 10

Page({
  data: {
    categories: [{ id: 0, name: '全部' }],
    activeCat: 0,
    sortOptions: SORT_OPTIONS,
    sortBy: 'new',
    list: [],
    page: 1,
    hasMore: true,
    loading: false,
    initialLoading: true,
    recommends: [],
  },

  onLoad() {
    this.loadCategories()
    this.loadRecommend()
    this.refreshList()
  },

  onShow() {
    app.refreshCartBadge()
  },

  onPullDownRefresh() {
    this.refreshList().finally(() => wx.stopPullDownRefresh())
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMore()
    }
  },

  async loadCategories() {
    try {
      const tree = await api.product.categoriesTree()
      // 取一级分类 + 全部
      const top = (tree || []).filter((n) => !n.parentId)
      this.setData({
        categories: [{ id: 0, name: '全部' }, ...top.map((c) => ({ id: c.id, name: c.name }))],
      })
    } catch (e) {
      // 已 toast
    }
  },

  async loadRecommend() {
    try {
      const list = filterVisibleProducts(await api.product.recommend(8))
      this.setData({ recommends: list || [] })
    } catch (e) {}
  },

  // 切换分类
  onCatTap(e) {
    const id = Number(e.currentTarget.dataset.id)
    if (id === this.data.activeCat) return
    this.setData({ activeCat: id }, () => this.refreshList())
  },

  // 切换排序
  onSortTap(e) {
    const id = e.currentTarget.dataset.id
    if (id === this.data.sortBy) return
    this.setData({ sortBy: id }, () => this.refreshList())
  },

  goSearch() {
    wx.navigateTo({ url: '/pages/search/search' })
  },

  // 重新加载第一页
  async refreshList() {
    this.setData({ page: 1, hasMore: true, list: [], loading: true })
    try {
      const res = await this.fetchPage(1)
      this.setData({
        list: res.list,
        hasMore: res.list.length >= PAGE_SIZE && this.data.list.length + res.list.length < res.total,
        page: 1,
        initialLoading: false,
      })
    } catch (e) {
      this.setData({ initialLoading: false })
    } finally {
      this.setData({ loading: false })
    }
  },

  async loadMore() {
    if (this.data.loading || !this.data.hasMore) return
    this.setData({ loading: true })
    try {
      const next = this.data.page + 1
      const res = await this.fetchPage(next)
      const merged = this.data.list.concat(res.list)
      this.setData({
        list: merged,
        page: next,
        hasMore: merged.length < res.total,
      })
    } catch (e) {
      // ignore
    } finally {
      this.setData({ loading: false })
    }
  },

  fetchPage(page) {
    const params = {
      sort: this.data.sortBy,
      page,
      pageSize: PAGE_SIZE,
    }
    if (this.data.activeCat) params.categoryId = this.data.activeCat
    return api.product.list(params)
  },
})
