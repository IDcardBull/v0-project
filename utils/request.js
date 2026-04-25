// utils/request.js
// =====================================================
// 统一 HTTP 请求封装（对接 NestJS 后端 /client/* 接口）
// 响应信封：{ code, data, message }
// 401 自动清 token 并跳登录
// =====================================================

// TODO: 上线前改为 HTTPS 生产域名
const BASE_URL = 'http://192.168.1.5:3001/api'

const NO_AUTH_PATHS = [
  '/client/auth/mini-login',
  '/client/auth/wechat-login',
  '/client/auth/phone-login',
  '/client/categories',
  '/client/categories/tree',
  '/client/brands',
  '/client/products',
]

function isPublic(url) {
  return NO_AUTH_PATHS.some((p) => url === p || url.startsWith(p + '?') || url.startsWith(p + '/'))
}

function request(options) {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('token')
    const url = options.url

    // 需要登录但无 token 时直接跳登录
    if (!isPublic(url) && !token && !options.skipAuth) {
      wx.navigateTo({ url: '/pages/login/login' })
      return reject(new Error('未登录'))
    }

    if (options.loading) {
      wx.showLoading({ title: options.loadingText || '加载中', mask: true })
    }

    wx.request({
      url: BASE_URL + url,
      method: options.method || 'GET',
      data: options.data,
      header: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
        ...(options.header || {}),
      },
      success(res) {
        if (options.loading) wx.hideLoading()

        if (res.statusCode === 401 || res.statusCode === 403) {
          wx.removeStorageSync('token')
          wx.removeStorageSync('userInfo')
          const pages = getCurrentPages()
          const cur = pages[pages.length - 1]
          if (cur && cur.route !== 'pages/login/login') {
            wx.reLaunch({ url: '/pages/login/login' })
          }
          return reject(new Error('登录已过期，请重新登录'))
        }

        const body = res.data || {}
        if (body.code === 0) {
          resolve(body.data)
        } else {
          const msg = body.message || `请求失败 (${res.statusCode})`
          if (!options.silent) {
            wx.showToast({ title: msg, icon: 'none', duration: 2000 })
          }
          reject(new Error(msg))
        }
      },
      fail(err) {
        if (options.loading) wx.hideLoading()
        if (!options.silent) {
          wx.showToast({ title: '网络错误，请检查连接', icon: 'none' })
        }
        reject(err)
      },
    })
  })
}

function isLogin() {
  return !!wx.getStorageSync('token')
}

module.exports = {
  BASE_URL,
  isLogin,
  get: (url, data, opts = {}) => request({ url, method: 'GET', data, ...opts }),
  post: (url, data, opts = {}) => request({ url, method: 'POST', data, ...opts }),
  put: (url, data, opts = {}) => request({ url, method: 'PUT', data, ...opts }),
  patch: (url, data, opts = {}) => request({ url, method: 'PATCH', data, ...opts }),
  del: (url, data, opts = {}) => request({ url, method: 'DELETE', data, ...opts }),
}
