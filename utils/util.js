// 通用工具函数
const formatMoney = (n) => {
  if (n === null || n === undefined || isNaN(n)) return '0.00'
  return Number(n).toFixed(2)
}

const formatDate = (d) => {
  const date = d instanceof Date ? d : new Date(d)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${dd} ${hh}:${mm}`
}

const genOrderNo = () => {
  const t = Date.now().toString().slice(-10)
  const r = Math.random().toString().slice(2, 6)
  return `YM${t}${r}`
}

module.exports = { formatMoney, formatDate, genOrderNo }
