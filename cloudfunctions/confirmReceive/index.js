// 云函数：confirmReceive - 用户确认收货（仅 shipping 状态可确认）
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { id } = event

  if (!id) return { code: 1, message: '订单 id 必填' }

  try {
    const res = await db.collection('orders').doc(id).get()
    const order = res.data
    if (!order || order._openid !== openid) {
      return { code: 1, message: '订单不存在' }
    }
    if (order.status !== 'shipping') {
      return { code: 1, message: '当前状态不允许确认收货' }
    }
    await db.collection('orders').doc(id).update({
      data: {
        status: 'completed',
        completedAt: db.serverDate(),
        updatedAt: db.serverDate(),
      },
    })
    return { code: 0, message: '已确认收货' }
  } catch (e) {
    return { code: 1, message: e.message }
  }
}
