// 云函数：getOrderStats - 当前用户各订单状态数量
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async () => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  try {
    const statuses = ['pending', 'shipping', 'completed', 'cancelled']
    const counts = await Promise.all(
      statuses.map((s) =>
        db.collection('orders').where({ _openid: openid, status: s }).count(),
      ),
    )
    const stats = {}
    statuses.forEach((s, i) => (stats[s] = counts[i].total))
    return { code: 0, data: stats }
  } catch (e) {
    return { code: 1, message: e.message }
  }
}
