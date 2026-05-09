// utils/request.js
// =====================================================
// 统一 HTTP 请求封装（对接 NestJS 后端 /client/* 接口）
// 响应信封：{ code, data, message }
// 401 自动清 token 并跳登录
// =====================================================

// TODO: 上线前改为 HTTPS 生产域名
const BASE_URL = 'http://127.0.0.1:3001/api'

const NO_AUTH_PATHS = [
  '/client/auth/mini-login',
  '/client/auth/wechat-login',
  '/client/auth/phone-login',
  '/client/categories',
  '/client/categories/tree',
  '/client/product/list',
  '/client/products',
  '/client/config',
]


function isAdminPath(url) {
  return typeof url === 'string' && url.indexOf('/admin/') === 0
}

function isPublic(url) {
  return NO_AUTH_PATHS.some((p) => url === p || url.startsWith(p + '?') || url.startsWith(p + '/'))
}

function request(options) {
  return new Promise((resolve, reject) => {
    const url = options.url
    const isAdmin = options.auth === 'admin' || isAdminPath(url)
    const token = isAdmin
      ? (options.skipAuth ? '' : wx.getStorageSync('adminToken'))
      : (options.skipAuth ? '' : wx.getStorageSync('token'))

    // 需要登录但无 token 时直接跳对应登录页
    if (!isPublic(url) && !token && !options.skipAuth) {
      const target = isAdmin ? '/pages/admin/login/login' : '/pages/login/login'
      wx.navigateTo({ url: target })
      return reject(new Error('未登录'))
    }

    if (options.loading) {
      wx.showLoading({ title: options.loadingText || '加载中', mask: true })
    }

    // 修复：wx.request 在写方法（POST/PUT/PATCH/DELETE）下若 data=null/undefined，
    // 会把字符串 "null" 作为 body 发出。后端 NestJS 启用了 rawBody+严格 JSON 解析后，
    // 对根值为 null 的 body 直接抛 SyntaxError "Unexpected token 'n'..."。
    // 这里统一在写方法下兜底为 {}，让 body 永远是合法对象。
    const writeMethods = ['POST', 'PUT', 'PATCH', 'DELETE']
    const methodUpper = (options.method || 'GET').toUpperCase()
    const safeData = writeMethods.indexOf(methodUpper) >= 0 && options.data == null
      ? {}
      : options.data

    wx.request({
      url: BASE_URL + url,
      method: options.method || 'GET',
      data: safeData,
      header: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
        ...(options.header || {}),
      },
      success(res) {
        if (options.loading) wx.hideLoading()

        if (res.statusCode === 401 || res.statusCode === 403) {
          if (isAdmin) {
            wx.removeStorageSync('adminToken')
            wx.removeStorageSync('adminInfo')
            const app = getApp()
            if (app && app.globalData) {
              app.globalData.adminToken = ''
              app.globalData.adminInfo = null
            }
            const pages = getCurrentPages()
            const cur = pages[pages.length - 1]
            if (cur && cur.route !== 'pages/admin/login/login' && !options.silent) {
              wx.navigateTo({ url: '/pages/admin/login/login' })
            }
          } else {
            wx.removeStorageSync('token')
            wx.removeStorageSync('userInfo')
            const pages = getCurrentPages()
            const cur = pages[pages.length - 1]
            if (cur && cur.route !== 'pages/login/login') {
              wx.reLaunch({ url: '/pages/login/login' })
            }
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
