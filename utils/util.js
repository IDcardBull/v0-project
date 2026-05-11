// utils/util.js
// =====================================================
// 通用工具方法
// =====================================================

// 价格格式化：99.5 -> "99.50"
function formatPrice(n) {
  if (n === null || n === undefined || n === '') return '0.00'
  const num = Number(n)
  if (Number.isNaN(num)) return '0.00'
  return num.toFixed(2)
}

function firstValidNumber(...values) {
  for (const v of values) {
    if (v === null || v === undefined || v === '') continue
    const n = Number(v)
    if (!Number.isNaN(n)) return n
  }
  return 0
}

function getBasePrice(item) {
  return firstValidNumber(
    item && item.wholesalePrice,
    item && item.wholesale_price,
    item && item.salePrice,
    item && item.sale_price,
    item && item.price,
    item && item.retailPrice,
    item && item.retail_price,
    item && item.memberPrice,
    item && item.member_price
  )
}

// 解析 priceTiers：批发端单价唯一来源（后端 sku.priceTiers[*].price）
// UI 已不再展示阶梯表，但取价仍依赖此函数
function normalizePriceTiers(source) {
  const raw = source && (
    source.priceTiers ||
    source.price_tiers ||
    source.tierPrices ||
    source.tier_prices ||
    source.wholesalePriceTiers ||
    source.wholesale_price_tiers
  )

  if (!Array.isArray(raw)) return []

  return raw
    .map((tier) => {
      const minQty = firstValidNumber(tier.minQty, tier.min_qty, tier.startQty, tier.start_qty, tier.qty)
      const maxRaw = tier.maxQty !== undefined ? tier.maxQty :
        tier.max_qty !== undefined ? tier.max_qty :
          tier.endQty !== undefined ? tier.endQty : tier.end_qty
      const maxQty = maxRaw === null || maxRaw === undefined || maxRaw === '' ? null : Number(maxRaw)
      const price = firstValidNumber(
        tier.price,
        tier.unitPrice,
        tier.unit_price,
        tier.wholesalePrice,
        tier.wholesale_price,
        tier.tierPrice,
        tier.tier_price
      )

      return {
        ...tier,
        minQty: minQty || 1,
        maxQty: Number.isNaN(maxQty) ? null : maxQty,
        price,
      }
    })
    .filter((tier) => tier.price > 0)
    .sort((a, b) => a.minQty - b.minQty)
}

function getSkuPriceTiers(sku, product) {
  const skuTiers = normalizePriceTiers(sku)
  if (skuTiers.length) return skuTiers
  return normalizePriceTiers(product)
}

// 已下线起订量限制：批发端统一 1 件起，不再读取后端 minOrderQty / 阶梯首档
function getMinWholesaleQty(_product, _tiers = []) {
  return 1
}


// 时间格式化：ISO -> "YYYY-MM-DD HH:mm"
function formatTime(iso, withSecond = false) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}${withSecond ? ':' + pad(d.getSeconds()) : ''}`
  return `${date} ${time}`
}

// 简单防抖
function debounce(fn, wait = 300) {
  let timer = null
  return function (...args) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn.apply(this, args), wait)
  }
}

// 取批发单价：阶梯已下线，统一取 priceTiers 第一档作为单价；无 tier 则回退
function pickTierPrice(_qty, priceTiers, fallbackPrice) {
  const tiers = normalizePriceTiers({ priceTiers })
  if (tiers.length && tiers[0].price > 0) return Number(tiers[0].price)
  return Number(fallbackPrice) || 0
}

// 订单状态映射（兼容多种后端枚举命名）
const ORDER_STATUS_MAP = {
  pending: { text: '待客服确认', color: '#c84d3a' },
  pending_pay: { text: '待客服确认', color: '#c84d3a' },
  pendingPay: { text: '待客服确认', color: '#c84d3a' },
  unpaid: { text: '待客服确认', color: '#c84d3a' },
  paid: { text: '待发货', color: '#3c5a6f' },
  pending_ship: { text: '待发货', color: '#3c5a6f' },
  pendingShip: { text: '待发货', color: '#3c5a6f' },
  shipped: { text: '待收货', color: '#3c5a6f' },
  delivered: { text: '待收货', color: '#3c5a6f' },
  completed: { text: '已完成', color: '#888888' },
  after_sale: { text: '售后中', color: '#c84d3a' },
  afterSale: { text: '售后中', color: '#c84d3a' },
  refunding: { text: '退款中', color: '#c84d3a' },
  cancelled: { text: '已取消', color: '#888888' },
  canceled: { text: '已取消', color: '#888888' },
  closed: { text: '已关闭', color: '#888888' },
}

const ORDER_STATUS_GROUPS = {
  pending: ['pending', 'pending_pay', 'pendingPay', 'unpaid'], // B2B语义：已提交采购单，待客服确认
  paid: ['paid', 'pending_ship', 'pendingShip'],
  shipped: ['shipped', 'delivered'],
  completed: ['completed'],
  cancelled: ['cancelled', 'canceled', 'closed'],
  after_sale: ['after_sale', 'afterSale', 'refunding'],
}

function normalizeOrderStatus(status) {
  const raw = status == null ? '' : String(status)
  const hit = Object.keys(ORDER_STATUS_GROUPS).find((key) => ORDER_STATUS_GROUPS[key].includes(raw))
  return hit || raw
}

function isOrderStatus(status, group) {
  return normalizeOrderStatus(status) === group
}

function orderStatusText(status) {
  return (ORDER_STATUS_MAP[status] && ORDER_STATUS_MAP[status].text) || status || ''
}

function orderStatusColor(status) {
  return (ORDER_STATUS_MAP[status] && ORDER_STATUS_MAP[status].color) || '#888888'
}

function toIdStr(id) {
  return id == null ? '' : String(id)
}

// 兼容旧调用
const formatMoney = formatPrice
const formatDate = (d) => formatTime(d instanceof Date ? d.toISOString() : d)

module.exports = {
  formatPrice,
  formatMoney,
  firstValidNumber,
  getBasePrice,
  normalizePriceTiers,
  getSkuPriceTiers,
  getMinWholesaleQty,
  formatTime,
  formatDate,
  debounce,
  pickTierPrice,
  orderStatusText,
  orderStatusColor,
  normalizeOrderStatus,
  isOrderStatus,
  // 别名（页面里通常这样调用）
  statusText: orderStatusText,
  statusColor: orderStatusColor,
  toIdStr,
  ORDER_STATUS_MAP,
}
