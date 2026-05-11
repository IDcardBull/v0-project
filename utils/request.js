// utils/request.js
// =====================================================
// 统一 HTTP 请求封装（对接 NestJS 后端 /client/* 接口）
// 响应信封：{ code, data, message }
// 401 自动清 token 并跳登录
// =====================================================

// 备案前临时用 IP；备案 + SSL 后改为 'https://api.yangmintaoci.cn'
const HOST = 'http://124.221.2.61'
const BASE_URL = HOST + '/api'
const IMAGE_BASE_URL = HOST  // 给 wxml 拼图片用

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

// 把后端返回的相对路径 /uploads/xxx 自动加上域名前缀
function fixImageUrl(value) {
  if (value == null) return value
  if (typeof value === 'string') {
    if (value.startsWith('/uploads/') || value.startsWith('uploads/')) {
      return HOST + (value.startsWith('/') ? '' : '/') + value
    }
    return value
  }
  if (Array.isArray(value)) {
    return value.map(fixImageUrl)
  }
  if (typeof value === 'object') {
    const out = {}
    for (const k in value) {
      out[k] = fixImageUrl(value[k])
    }
    return out
  }
  return value
}

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

    if (!isPublic(url) && !token && !options.skipAuth) {
      const target = isAdmin ? '/pages/admin/login/login' : '/pages/login/login'
      wx.navigateTo({ url: target })
      return reject(new Error('未登录'))
    }

    if (options.loading) {
      wx.showLoading({ title: options.loadingText || '加载中', mask: true })
    }

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
          // 关键：自动给所有 /uploads/... 字段拼上域名
          resolve(fixImageUrl(body.data))
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
  HOST,
  IMAGE_BASE_URL,
  isLogin,
  get: (url, data, opts = {}) => request({ url, method: 'GET', data, ...opts }),
  post: (url, data, opts = {}) => request({ url, method: 'POST', data, ...opts }),
  put: (url, data, opts = {}) => request({ url, method: 'PUT', data, ...opts }),
  patch: (url, data, opts = {}) => request({ url, method: 'PATCH', data, ...opts }),
  del: (url, data, opts = {}) => request({ url, method: 'DELETE', data, ...opts }),
}