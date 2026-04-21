// 商品 Mock 数据（实际项目请接入后端接口）
const products = [
  {
    id: 'P001',
    sku: 'YM-TS-1888',
    name: '羊脂玉白瓷·梅兰功夫茶具整套（一壶四杯）',
    image: '/images/products/tea-set-01.jpg',
    images: [
      '/images/products/tea-set-01.jpg',
      '/images/products/tea-cup-01.jpg',
      '/images/products/gaiwan-01.jpg'
    ],
    tags: ['现货', '纯手工', '高白瓷'],
    attrs: ['景德镇产', '一壶四杯', '支持刻字', '礼盒包装'],
    category: 'tea-set',
    stockStatus: '现货',
    minOrderQty: 12,
    unit: '套',
    soldRecent: 328,
    stock: 1520,
    price: 128,
    tiers: [
      { min: 12,  max: 49,  price: 128 },
      { min: 50,  max: 199, price: 108 },
      { min: 200, max: 499, price: 95 },
      { min: 500, max: null, price: 82 }
    ],
    detail: [
      { label: '材质', value: '高白瓷（氧化铝 ≥ 28%）' },
      { label: '工艺', value: '1320°C 高温烧制 · 全手工绘制' },
      { label: '规格', value: '壶 180ml · 杯 45ml × 4' },
      { label: '包装', value: '硬质礼盒 + 防震内衬 · 可定制商标' },
      { label: '起订', value: '12 套起批 · 48h 内发货' }
    ]
  },
  {
    id: 'P002',
    sku: 'YM-TC-0632',
    name: '手工拉坯·青灰釉单杯',
    image: '/images/products/tea-cup-01.jpg',
    images: ['/images/products/tea-cup-01.jpg'],
    tags: ['预售', '手工拉坯'],
    attrs: ['单杯 60ml', '可刻字', '单色釉'],
    category: 'cup',
    stockStatus: '预售 7 天',
    minOrderQty: 50,
    unit: '只',
    soldRecent: 1240,
    stock: 6800,
    price: 18,
    tiers: [
      { min: 50,  max: 199, price: 18 },
      { min: 200, max: 999, price: 14 },
      { min: 1000, max: null, price: 11 }
    ],
    detail: [
      { label: '材质', value: '高岭土 · 青灰釉' },
      { label: '工艺', value: '全手工拉坯' },
      { label: '规格', value: '口径 70mm · 容量 60ml' },
      { label: '包装', value: '独立泡沫袋 + 纸箱' },
      { label: '起订', value: '50 只起批' }
    ]
  },
  {
    id: 'P003',
    sku: 'YM-VA-0211',
    name: '青花缠枝莲·收藏级观赏瓶',
    image: '/images/products/vase-01.jpg',
    images: ['/images/products/vase-01.jpg'],
    tags: ['特惠', '限量 200 件'],
    attrs: ['手绘青花', '高 38cm', '礼品级'],
    category: 'vase',
    stockStatus: '现货',
    minOrderQty: 2,
    unit: '件',
    soldRecent: 68,
    stock: 180,
    price: 680,
    tiers: [
      { min: 2,  max: 9,  price: 680 },
      { min: 10, max: 49, price: 598 },
      { min: 50, max: null, price: 528 }
    ],
    detail: [
      { label: '材质', value: '高白瓷 · 釉下青花' },
      { label: '工艺', value: '老师傅手绘 · 单件落款' },
      { label: '规格', value: '高 38cm · 口径 12cm' },
      { label: '包装', value: '木箱 + 绸缎内衬' },
      { label: '起订', value: '2 件起批' }
    ]
  },
  {
    id: 'P004',
    sku: 'YM-BS-0477',
    name: '日式白瓷碗六件套（家用/餐饮）',
    image: '/images/products/bowl-set-01.jpg',
    images: ['/images/products/bowl-set-01.jpg'],
    tags: ['现货', '酒店同款'],
    attrs: ['6 件套', '耐高温', '可叠放'],
    category: 'tableware',
    stockStatus: '现货',
    minOrderQty: 20,
    unit: '套',
    soldRecent: 542,
    stock: 2400,
    price: 48,
    tiers: [
      { min: 20,  max: 99,  price: 48 },
      { min: 100, max: 499, price: 39 },
      { min: 500, max: null, price: 32 }
    ],
    detail: [
      { label: '材质', value: '高白瓷 · 食品级无铅釉' },
      { label: '工艺', value: '机压成型 · 1280°C 烧成' },
      { label: '规格', value: '6 只 / 套 · 口径 11cm' },
      { label: '包装', value: '彩盒 · 外箱 12 套' },
      { label: '起订', value: '20 套起批' }
    ]
  },
  {
    id: 'P005',
    sku: 'YM-GW-0158',
    name: '粉彩花鸟·三才盖碗（150ml）',
    image: '/images/products/gaiwan-01.jpg',
    images: ['/images/products/gaiwan-01.jpg'],
    tags: ['现货', '手绘粉彩'],
    attrs: ['150ml', '碗盖托三件', '送礼首选'],
    category: 'tea-set',
    stockStatus: '现货',
    minOrderQty: 10,
    unit: '个',
    soldRecent: 196,
    stock: 900,
    price: 88,
    tiers: [
      { min: 10,  max: 49,  price: 88 },
      { min: 50,  max: 199, price: 72 },
      { min: 200, max: null, price: 62 }
    ],
    detail: [
      { label: '材质', value: '高白瓷 · 釉上粉彩' },
      { label: '工艺', value: '手绘花鸟 · 二次烧成' },
      { label: '规格', value: '容量 150ml · 三件齐全' },
      { label: '包装', value: '织锦礼盒' },
      { label: '起订', value: '10 个起批' }
    ]
  }
]

const categories = [
  { id: 'all',        name: '全部',     icon: '全' },
  { id: 'tea-set',    name: '茶具套装', icon: '茶' },
  { id: 'cup',        name: '单品茶杯', icon: '杯' },
  { id: 'gaiwan',     name: '盖碗',     icon: '碗' },
  { id: 'vase',       name: '工艺件',   icon: '艺' },
  { id: 'tableware',  name: '餐瓷',     icon: '餐' },
  { id: 'custom',     name: '定制',     icon: '定' }
]

// 根据阶梯价表计算单价
function getTierPrice(product, qty) {
  if (!product || !product.tiers) return 0
  for (const t of product.tiers) {
    if (qty >= t.min && (t.max === null || qty <= t.max)) return t.price
  }
  return product.tiers[0].price
}

module.exports = {
  products,
  categories,
  getTierPrice,
  getProductById(id) {
    return products.find(p => p.id === id)
  },
  getByCategory(catId) {
    if (!catId || catId === 'all') return products
    return products.filter(p => p.category === catId)
  },
  search(keyword) {
    if (!keyword) return products
    const k = keyword.trim().toLowerCase()
    return products.filter(p =>
      p.name.toLowerCase().includes(k) ||
      p.sku.toLowerCase().includes(k) ||
      (p.tags || []).some(t => t.toLowerCase().includes(k))
    )
  }
}
