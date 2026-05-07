// pages/address/address.js
const api = require('../../utils/api.js')
const app = getApp()

Page({
  data: {
    list: [],
    pickerMode: false,    // 来自 checkout 选择地址
    loading: true,
  },

  onLoad(options) {
    this.setData({ pickerMode: options && options.picker === '1' })
    if (this.data.pickerMode) {
      wx.setNavigationBarTitle({ title: '选择收货地址' })
    }
  },

  onShow() {
    if (!app.ensureLogin()) return
    this.loadList()
  },

  async loadList() {
    try {
      this.setData({ loading: true })
      const list = await api.address.list()
      this.setData({ list: list || [] })
    } catch (e) {
      // ignore
    } finally {
      this.setData({ loading: false })
    }
  },

  // 选择地址（来自 checkout）
  onSelect(e) {
    if (!this.data.pickerMode) return
    const id = Number(e.currentTarget.dataset.id)
    const addr = this.data.list.find((x) => Number(x.id) === id)
    if (!addr) return
    // 用 EventChannel 把选中地址回传给 checkout
    const eventChannel = this.getOpenerEventChannel && this.getOpenerEventChannel()
    if (eventChannel && eventChannel.emit) {
      eventChannel.emit('addressSelected', addr)
    }
    wx.navigateBack()
  },

  async setDefault(e) {
    const id = Number(e.currentTarget.dataset.id)
    try {
      await api.address.setDefault(id)
      wx.showToast({ title: '已设为默认', icon: 'success' })
      this.loadList()
    } catch (err) {}
  },

  edit(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/address-edit/address-edit?id=${id}` })
  },

  remove(e) {
    const id = Number(e.currentTarget.dataset.id)
    wx.showModal({
      title: '提示',
      content: '确定删除该地址？',
      success: async (res) => {
        if (!res.confirm) return
        try {
          await api.address.remove(id)
          wx.showToast({ title: '已删除', icon: 'success' })
          this.loadList()
        } catch (err) {}
      },
    })
  },

  add() {
    wx.navigateTo({ url: '/pages/address-edit/address-edit' })
  },
})
