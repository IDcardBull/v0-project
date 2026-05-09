// utils/admin-format.js
// =====================================================
// 移动管理工作台共用：把后端 /admin/* 返回的对象规整成
// 页面好直接绑定的形状（B2B 后台 API 字段命名不太一致）。
// =====================================================

const STATUS_LABELS = {
  pending_pay: '待付款',
  pending_ship: '待发货',
  shipped: '已发货',
  completed: '已完成',
  closed: '已关闭',
  cancelled: '已取消',
  after_sale: '售后中',
}

const STATUS_NOTES = {
  pending_pay: '客户尚未付款。可以改价后让客户重新支付。',
  pending_ship: '客户已付款，请尽快安排发货。',
  shipped: '已发货，等待客户签收。',
  completed: '订单已完成。',
  closed: '订单已关闭。',
  cancelled: '订单已取消。',
  after_sale: '客户提交了售后申请。',
}

function fmtMoney(n) {
  const v = Number(n || 0)
  return Number.isFinite(v) ? v.toFixed(2) : '0.00'
}

function pickList(res) {
  if (!res) return []
  if (Array.isArray(res)) return res
  if (Array.isArray(res.list)) return res.list
  if (Array.isArray(res.records)) return res.records
  if (Array.isArray(res.items)) return res.items
  if (Array.isArray(res.data)) return res.data
  return []
}

function normalizeAddress(a) {
  if (!a) return null
  const region = [a.province, a.city, a.district].filter(Boolean).join('')
  return {
    receiver: a.receiver || a.contact || a.name || '',
    phone: a.phone || a.mobile || '',
    full: region + (a.detail || a.address || ''),
  }
}

function normalizeItems(items) {
  if (!Array.isArray(items)) return []
  return items.map((it) => {
    const sku = it.sku || it.skuInfo || {}
    const product = it.product || it.productInfo || {}
    const specs = sku.specs || it.specs || {}
    let specText = ''
    if (typeof specs === 'string') {
      try { specText = Object.values(JSON.parse(specs)).join(' · ') } catch (e) { specText = specs }
    } else if (specs && typeof specs === 'object') {
      specText = Object.values(specs).join(' · ')
    }
    const cover = it.image || it.cover || sku.image || product.cover || product.image || ''
    return {
      id: it.id || sku.id || it.skuId,
      name: it.productName || it.name || product.name || '商品',
      spec: specText,
      image: cover,
      price: fmtMoney(it.unitPrice || it.price || sku.retailPrice || sku.price),
      quantity: Number(it.quantity || it.qty || it.num || 0),
    }
  })
}

function normalizeOrder(raw) {
  if (!raw) return null
  const items = normalizeItems(raw.items || raw.orderItems || raw.products || [])
  const totalQty = items.reduce((acc, it) => acc + (it.quantity || 0), 0)
  const total = Number(raw.totalAmount || raw.total || raw.payAmount || 0)
  const subtotal = Number(raw.itemsAmount || raw.subTotal || (total - Number(raw.freight || 0)))
  return {
    id: raw.id,
    orderNo: raw.orderNo || raw.orderNumber || raw.no || String(raw.id || ''),
    statusKey: raw.status || raw.statusKey || 'pending_pay',
    statusLabel: STATUS_LABELS[raw.status] || raw.statusName || raw.status,
    statusNote: STATUS_NOTES[raw.status] || '',
    user: {
      nickname: (raw.user && (raw.user.nickname || raw.user.realName)) || raw.userNickname || '',
      phone: (raw.user && raw.user.phone) || raw.userPhone || '',
    },
    address: normalizeAddress(raw.address || raw.shippingAddress),
    remark: raw.remark || raw.buyerRemark || '',
    items,
    itemsCount: items.length,
    totalQty,
    subtotal: fmtMoney(subtotal > 0 ? subtotal : (total - Number(raw.freight || 0))),
    freight: fmtMoney(raw.freight || raw.shippingFee || 0),
    discount: fmtMoney(raw.discount || 0),
    total: fmtMoney(total),
    totalRaw: total,
    paidAmount: fmtMoney(raw.paidAmount || raw.paid || 0),
    createdAt: raw.createdAt || raw.created_at || '',
    paidAt: raw.paidAt || null,
    shippedAt: raw.shippedAt || null,
    channel: raw.channel || 'wholesale',
  }
}

function normalizeProduct(raw) {
  if (!raw) return null
  const cover =
    raw.cover || raw.image || raw.thumb ||
    (Array.isArray(raw.images) && raw.images[0]) ||
    (Array.isArray(raw.gallery) && raw.gallery[0]) || ''
  const skus = Array.isArray(raw.skus) ? raw.skus : []
  const prices = skus.map((s) => Number(s.wholesalePrice || s.price || s.retailPrice || 0)).filter((n) => n > 0)
  const minPrice = prices.length ? Math.min.apply(null, prices) : Number(raw.wholesalePrice || raw.minPrice || raw.price || 0)
  const maxPrice = prices.length ? Math.max.apply(null, prices) : Number(raw.maxPrice || minPrice)
  const stock = skus.reduce((acc, s) => acc + Number(s.stock || 0), 0) || Number(raw.stock || 0)
  return {
    id: raw.id,
    code: raw.code || raw.skuCode || raw.no || '',
    name: raw.name || raw.title || '',
    cover,
    minPrice: fmtMoney(minPrice),
    maxPrice: fmtMoney(maxPrice),
    skuCount: skus.length,
    stock,
    status: raw.status == null ? 1 : Number(raw.status),
    wholesaleEnabled: raw.wholesaleEnabled !== false && raw.wholesale !== false,
    skus,
  }
}

module.exports = {
  STATUS_LABELS,
  STATUS_NOTES,
  fmtMoney,
  pickList,
  normalizeOrder,
  normalizeProduct,
}
