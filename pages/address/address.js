Page({
  data: {
    list: [],
    selectMode: false,
  },

  onLoad(options) {
    this.setData({ selectMode: options && options.mode === 'select' });
  },

  onShow() {
    const list = wx.getStorageSync('addressList') || this.getDefaultList();
    this.setData({ list });
  },

  getDefaultList() {
    const list = [
      {
        id: 'a1',
        name: '陈采购',
        phone: '138 0000 1234',
        company: '福建茶香道茶叶有限公司',
        region: '福建省 福州市 鼓楼区',
        detail: '温泉路 88 号 鼎峰大厦 20 层',
        isDefault: true,
      },
      {
        id: 'a2',
        name: '王经理',
        phone: '139 8888 6666',
        company: '广州百盏茶器批发行',
        region: '广东省 广州市 荔湾区',
        detail: '芳村茶叶市场 B 区 12-15 档',
        isDefault: false,
      },
    ];
    wx.setStorageSync('addressList', list);
    return list;
  },

  onSelect(e) {
    if (!this.data.selectMode) return;
    const id = e.currentTarget.dataset.id;
    const addr = this.data.list.find((x) => x.id === id);
    const pages = getCurrentPages();
    const prev = pages[pages.length - 2];
    if (prev && prev.setData) {
      prev.setData({ selectedAddress: addr });
    }
    wx.navigateBack();
  },

  setDefault(e) {
    const id = e.currentTarget.dataset.id;
    const list = this.data.list.map((x) => ({ ...x, isDefault: x.id === id }));
    this.setData({ list });
    wx.setStorageSync('addressList', list);
    wx.showToast({ title: '已设为默认', icon: 'none' });
  },

  edit() {
    wx.showToast({ title: '编辑功能待接入', icon: 'none' });
  },

  remove(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '提示',
      content: '确定删除该地址？',
      success: (res) => {
        if (res.confirm) {
          const list = this.data.list.filter((x) => x.id !== id);
          this.setData({ list });
          wx.setStorageSync('addressList', list);
        }
      },
    });
  },

  add() {
    wx.showToast({ title: '新增地址待接入', icon: 'none' });
  },
});
