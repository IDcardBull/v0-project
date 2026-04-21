// 订单 Mock 数据
const mockOrders = [
  {
    id: 'YM2428181903',
    status: 'unpaid',
    statusText: '待付款',
    createdAt: '2026-04-18 11:22',
    items: [
      { id: 'P001', name: '羊脂玉白瓷·梅兰功夫茶具整套', image: '/images/products/tea-set-01.jpg', qty: 60, price: 108, unit: '套' }
    ],
    totalQty: 60, totalAmount: 6480, shipping: 0
  },
  {
    id: 'YM2428178822',
    status: 'paid',
    statusText: '待发货',
    createdAt: '2026-04-15 09:10',
    items: [
      { id: 'P004', name: '日式白瓷碗六件套', image: '/images/products/bowl-set-01.jpg', qty: 120, price: 39, unit: '套' },
      { id: 'P002', name: '手工拉坯·青灰釉单杯', image: '/images/products/tea-cup-01.jpg', qty: 300, price: 14, unit: '只' }
    ],
    totalQty: 420, totalAmount: 8880, shipping: 0
  },
  {
    id: 'YM2428136622',
    status: 'shipped',
    statusText: '已发货',
    createdAt: '2026-04-12 16:48',
    express: '顺丰速运 SF7188218822',
    items: [
      { id: 'P005', name: '粉彩花鸟·三才盖碗', image: '/images/products/gaiwan-01.jpg', qty: 80, price: 72, unit: '个' }
    ],
    totalQty: 80, totalAmount: 5760, shipping: 0
  },
  {
    id: 'YM2428091122',
    status: 'done',
    statusText: '已完成',
    createdAt: '2026-04-02 14:18',
    items: [
      { id: 'P003', name: '青花缠枝莲·收藏级观赏瓶', image: '/images/products/vase-01.jpg', qty: 10, price: 598, unit: '件' }
    ],
    totalQty: 10, totalAmount: 5980, shipping: 0
  }
]

module.exports = {
  mockOrders,
  getOrderById(id) {
    return mockOrders.find(o => o.id === id)
  }
}
