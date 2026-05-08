// 云函数：listOrders - 查询当前用户的订单列表（按状态过滤 + 分页）
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { status = '', page = 1, pageSize = 10 } = event

  const where = { _openid: openid }
  if (status) where.status = status

  const skip = (Math.max(1, page) - 1) * pageSize

  try {
    const [listRes, countRes] = await Promise.all([
      db
        .collection('orders')
        .where(where)
        .orderBy('createdAt', 'desc')
        .skip(skip)
        .limit(pageSize)
        .get(),
      db.collection('orders').where(where).count(),
    ])

    return {
      code: 0,
      data: {
        list: listRes.data.map((o) => ({ ...o, id: o._id })),
        total: countRes.total,
        page,
        pageSize,
      },
    }
  } catch (e) {
    return { code: 1, message: e.message }
  }
}
