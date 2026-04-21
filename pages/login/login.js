Page({
  data: {
    phone: '',
    code: '',
    agree: false,
    counting: false,
    countdown: 60,
  },

  onPhoneInput(e) {
    this.setData({ phone: e.detail.value });
  },
  onCodeInput(e) {
    this.setData({ code: e.detail.value });
  },
  toggleAgree() {
    this.setData({ agree: !this.data.agree });
  },

  sendCode() {
    const { phone, counting } = this.data;
    if (counting) return;
    if (!/^1\d{10}$/.test(phone)) {
      wx.showToast({ title: '请输入正确手机号', icon: 'none' });
      return;
    }
    this.setData({ counting: true, countdown: 60 });
    wx.showToast({ title: '验证码已发送', icon: 'none' });
    this._timer = setInterval(() => {
      const n = this.data.countdown - 1;
      if (n <= 0) {
        clearInterval(this._timer);
        this.setData({ counting: false, countdown: 60 });
      } else {
        this.setData({ countdown: n });
      }
    }, 1000);
  },

  onLogin() {
    const { phone, code, agree } = this.data;
    if (!agree) {
      wx.showToast({ title: '请先同意协议', icon: 'none' });
      return;
    }
    if (!/^1\d{10}$/.test(phone)) {
      wx.showToast({ title: '请输入正确手机号', icon: 'none' });
      return;
    }
    if (!code || code.length < 4) {
      wx.showToast({ title: '请输入验证码', icon: 'none' });
      return;
    }
    wx.setStorageSync('userInfo', {
      phone,
      nickName: '央茗采购商',
      company: '待完善企业资质',
      level: 'V1',
    });
    wx.showToast({ title: '登录成功', icon: 'success' });
    setTimeout(() => {
      wx.reLaunch({ url: '/pages/profile/profile' });
    }, 800);
  },

  onWxLogin() {
    wx.getUserProfile({
      desc: '用于完善会员资料',
      success: (res) => {
        wx.setStorageSync('userInfo', {
          phone: '',
          nickName: res.userInfo.nickName,
          avatarUrl: res.userInfo.avatarUrl,
          company: '待完善企业资质',
          level: 'V1',
        });
        wx.reLaunch({ url: '/pages/profile/profile' });
      },
      fail: () => {
        wx.showToast({ title: '已取消授权', icon: 'none' });
      },
    });
  },

  onUnload() {
    if (this._timer) clearInterval(this._timer);
  },
});
