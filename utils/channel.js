// utils/channel.js
// 当前小程序渠道配置：批发端使用 wholesale / miniprogram_b。
// 如果复制为零售端，只需改这里为 retail / miniprogram_a。
const CHANNEL = 'wholesale'
const SOURCE = 'miniprogram_b'

function getChannel() {
  return CHANNEL
}

function getSource() {
  return SOURCE
}

function channelParams(extra = {}) {
  return {
    channel: CHANNEL,
    ...extra,
  }
}

function orderChannelPayload(extra = {}) {
  return {
    channel: CHANNEL,
    source: SOURCE,
    ...extra,
  }
}

function isProductVisible(product) {
  if (!product) return false
  if (Number(product.status) !== 1) return false
  if (CHANNEL === 'retail') return product.retailEnabled === true
  if (CHANNEL === 'wholesale') return product.wholesaleEnabled === true
  return false
}

function filterVisibleProducts(products) {
  return (products || []).filter(isProductVisible)
}

function filterProductListResponse(res) {
  if (Array.isArray(res)) return filterVisibleProducts(res)
  if (!res || typeof res !== 'object') return res

  if (Array.isArray(res.list)) {
    return {
      ...res,
      list: filterVisibleProducts(res.list),
    }
  }

  if (Array.isArray(res.items)) {
    return {
      ...res,
      items: filterVisibleProducts(res.items),
    }
  }

  if (Array.isArray(res.records)) {
    return {
      ...res,
      records: filterVisibleProducts(res.records),
    }
  }

  return res
}

module.exports = {
  CHANNEL,
  SOURCE,
  getChannel,
  getSource,
  channelParams,
  orderChannelPayload,
  isProductVisible,
  filterVisibleProducts,
  filterProductListResponse,
}
