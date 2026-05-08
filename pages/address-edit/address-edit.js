// pages/address-edit/address-edit.js
const api = require('../../utils/api.js')

Page({
  data: {
    id: null,
    form: {
      receiver: '',
      phone: '',
      province: '',
      city: '',
      district: '',
      detail: '',
      isDefault: false,
      tag: '',
    },
    region: ['', '', ''],
    submitting: false,
  },

  onLoad(options) {
    if (options && options.id) {
      const id = Number(options.id)
      this.setData({ id })
      wx.setNavigationBarTitle({ title: '编辑地址' })
      this.loadDetail(id)
    } else {
      wx.setNavigationBarTitle({ title: '新增地址' })
    }
  },

  async loadDetail(id) {
    try {
      const a = await api.address.detail(id)
      if (!a) return
      this.setData({
        form: {
          receiver: a.receiver || '',
          phone: a.phone || '',
          province: a.province || '',
          city: a.city || '',
          district: a.district || '',
          detail: a.detail || '',
          isDefault: !!a.isDefault,
          tag: a.tag || '',
        },
        region: [a.province || '', a.city || '', a.district || ''],
      })
    } catch (e) {}
  },

  onInput(e) {
    const key = e.currentTarget.dataset.key
    this.setData({ [`form.${key}`]: e.detail.value })
  },

  onRegionChange(e) {
    const [province, city, district] = e.detail.value
    this.setData({
      region: e.detail.value,
      'form.province': province,
      'form.city': city,
      'form.district': district,
    })
  },

  toggleDefault() {
    this.setData({ 'form.isDefault': !this.data.form.isDefault })
  },

  setTag(e) {
    const tag = e.currentTarget.dataset.tag
    this.setData({ 'form.tag': this.data.form.tag === tag ? '' : tag })
  },

  validate() {
    const f = this.data.form
    if (!f.receiver.trim()) return '请输入收货人姓名'
    if (!/^1\d{10}$/.test(f.phone)) return '请输入正确的手机号'
    if (!f.province || !f.city || !f.district) return '请选择所在地区'
    if (!f.detail.trim()) return '请填写详细地址'
    return null
  },

  async save() {
    if (this.data.submitting) return
    const err = this.validate()
    if (err) {
      wx.showToast({ title: err, icon: 'none' })
      return
    }
    this.setData({ submitting: true })
    try {
      const payload = { ...this.data.form }
      if (this.data.id) {
        await api.address.update(this.data.id, payload)
        wx.showToast({ title: '已保存', icon: 'success' })
      } else {
        await api.address.create(payload)
        wx.showToast({ title: '已添加', icon: 'success' })
      }
      setTimeout(() => wx.navigateBack(), 600)
    } catch (e) {
      // ignore
    } finally {
      this.setData({ submitting: false })
    }
  },
})
