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

// 阶梯价命中：根据数量从 priceTiers 中选当前单价
function pickTierPrice(qty, priceTiers, fallbackPrice) {
  if (!priceTiers || !priceTiers.length) return Number(fallbackPrice) || 0
  const sorted = [...priceTiers].sort((a, b) => a.minQty - b.minQty)
  let hit = null
  for (const t of sorted) {
    const min = Number(t.minQty) || 0
    const max = t.maxQty == null ? Infinity : Number(t.maxQty)
    if (qty >= min && qty <= max) {
      hit = t
      break
    }
  }
  return Number(hit ? hit.price : fallbackPrice) || 0
}

// 订单状态映射（询价 + 人工处理流程，仅 4 个状态）
const ORDER_STATUS_MAP = {
  pending:   { text: '待确认', color: '#c84d3a' }, // 用户已下单，等待客服联系
  shipping:  { text: '待发货', color: '#3c5a6f' }, // 客服已确认，等待出货
  completed: { text: '已完成', color: '#888888' }, // 已收货 / 客服关闭
  cancelled: { text: '已取消', color: '#888888' }, // 用户取消 / 客服取消
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
  formatTime,
  formatDate,
  debounce,
  pickTierPrice,
  orderStatusText,
  orderStatusColor,
  // 别名（页面里通常这样调用）
  statusText: orderStatusText,
  statusColor: orderStatusColor,
  toIdStr,
  ORDER_STATUS_MAP,
}
