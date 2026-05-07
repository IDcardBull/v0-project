// pages/address-edit/address-edit.js
const api = require('../../utils/api.js')

const PROVINCES = [
  '北京市', '天津市', '上海市', '重庆市',
  '河北省', '山西省', '辽宁省', '吉林省', '黑龙江省',
  '江苏省', '浙江省', '安徽省', '福建省', '江西省', '山东省',
  '河南省', '湖北省', '湖南省', '广东省', '海南省',
  '四川省', '贵州省', '云南省', '陕西省', '甘肃省', '青海省',
  '台湾省',
  '内蒙古自治区', '广西壮族自治区', '西藏自治区', '宁夏回族自治区', '新疆维吾尔自治区',
  '香港特别行政区', '澳门特别行政区',
]

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
    regionChosen: false,
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
        regionChosen: !!(a.province && a.city && a.district),
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
      regionChosen: true,
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

  isValidProvince(name) {
    return PROVINCES.includes((name || '').trim())
  },

  validate() {
    const f = this.data.form
    if (!f.receiver.trim()) return '请输入收货人姓名'
    if (!/^1\d{10}$/.test(f.phone)) return '请输入正确的手机号'
    if (!this.data.regionChosen) return '请下拉选择省市区'
    if (!f.province || !f.city || !f.district) return '请选择所在地区'
    if (!this.isValidProvince(f.province)) return '请选择有效省份'
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
      const [province, city, district] = this.data.region
      const payload = {
        ...this.data.form,
        province: (province || '').trim(),
        city: (city || '').trim(),
        district: (district || '').trim(),
        detail: (this.data.form.detail || '').trim(),
        receiver: (this.data.form.receiver || '').trim(),
      }
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
