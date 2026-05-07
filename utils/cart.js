// utils/cart.js
// =====================================================
// 采购单（购物车）本地存储管理
// 数据结构：
//   [{ skuId, productId, productName, skuSpec, skuImage,
//      unitPrice, retailPrice, priceTiers, minWholesaleQty,
//      qty, selected, stock }]
// 策略：单价随数量自动重算（阶梯价）
// =====================================================
const {
  pickTierPrice,
  getBasePrice,
  normalizePriceTiers,
} = require('./util.js')

const KEY = 'cart'

function load() {
  return wx.getStorageSync(KEY) || []
}

function save(list) {
  wx.setStorageSync(KEY, list || [])
}

function recalcUnitPrice(item) {
  const tiers = normalizePriceTiers(item)
  const basePrice = getBasePrice(item)
  const tier = pickTierPrice(item.qty, tiers, basePrice)
  item.priceTiers = tiers
  item.retailPrice = basePrice
  item.unitPrice = tier
  return item
}

function getList() {
  const list = load()
  return list.map(recalcUnitPrice)
}

function add(payload) {
  const list = load()
  const idx = list.findIndex((i) => Number(i.skuId) === Number(payload.skuId))
  if (idx >= 0) {
    list[idx].qty += payload.qty || 1
  } else {
    list.push({
      selected: true,
      ...payload,
      qty: payload.qty || 1,
    })
  }
  list.forEach(recalcUnitPrice)
  save(list)
  return list
}

function updateQty(skuId, qty) {
  const list = load()
  const idx = list.findIndex((i) => Number(i.skuId) === Number(skuId))
  if (idx < 0) return list
  list[idx].qty = Math.max(1, Number(qty) || 1)
  recalcUnitPrice(list[idx])
  save(list)
  return list
}

function remove(skuId) {
  const list = load().filter((i) => Number(i.skuId) !== Number(skuId))
  save(list)
  return list
}

function removeMany(skuIds) {
  const set = new Set(skuIds.map(Number))
  const list = load().filter((i) => !set.has(Number(i.skuId)))
  save(list)
  return list
}

function clear() {
  save([])
}

function setSelected(skuId, selected) {
  const list = load()
  const idx = list.findIndex((i) => Number(i.skuId) === Number(skuId))
  if (idx < 0) return list
  list[idx].selected = !!selected
  save(list)
  return list
}

function setAllSelected(selected) {
  const list = load()
  list.forEach((i) => (i.selected = !!selected))
  save(list)
  return list
}

function totalCount() {
  return load().reduce((sum, i) => sum + (Number(i.qty) || 0), 0)
}

function selectedItems() {
  return getList().filter((i) => i.selected)
}

function summary(items = selectedItems()) {
  const goodsAmount = items.reduce((s, i) => s + Number(i.unitPrice) * Number(i.qty), 0)
  const totalQty = items.reduce((s, i) => s + Number(i.qty), 0)
  return {
    goodsAmount: Number(goodsAmount.toFixed(2)),
    totalQty,
    itemCount: items.length,
  }
}

module.exports = {
  save,
  getList,
  add,
  updateQty,
  remove,
  removeMany,
  clear,
  setSelected,
  setAllSelected,
  totalCount,
  selectedItems,
  summary,
}
