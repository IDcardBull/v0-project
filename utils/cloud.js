// utils/cloud.js
// =====================================================
// 微信小程序云开发统一调用封装
// 所有订单相关接口走云函数，复用响应信封 { code, data, message }
// 启动初始化由 app.js 完成（wx.cloud.init）
// =====================================================

function call(name, data = {}) {
  return new Promise((resolve, reject) => {
    if (!wx.cloud) {
      wx.showToast({ title: '请使用基础库 2.2.3 以上', icon: 'none' })
      return reject(new Error('wx.cloud 不可用'))
    }
    wx.cloud.callFunction({
      name,
      data,
      success: (res) => {
        const result = res && res.result
        if (!result) return reject(new Error('云函数无返回'))
        if (result.code !== 0) {
          wx.showToast({ title: result.message || '操作失败', icon: 'none' })
          return reject(result)
        }
        resolve(result.data === undefined ? null : result.data)
      },
      fail: (err) => {
        wx.showToast({ title: '网络异常', icon: 'none' })
        reject(err)
      },
    })
  })
}

module.exports = {
  call,

  // 业务封装
  submitOrder: (payload) => call('submitOrder', payload),
  listOrders: (params) => call('listOrders', params),
  getOrder: (id) => call('getOrder', { id }),
  cancelOrder: (id) => call('cancelOrder', { id }),
  confirmReceive: (id) => call('confirmReceive', { id }),
  getOrderStats: () => call('getOrderStats'),
}
