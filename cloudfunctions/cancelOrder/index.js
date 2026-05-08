// 云函数：cancelOrder - 用户取消订单（仅 pending 状态可取消）
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
    if (order.status !== 'pending') {
      return { code: 1, message: '当前状态不允许取消' }
    }
    await db.collection('orders').doc(id).update({
      data: {
        status: 'cancelled',
        cancelledAt: db.serverDate(),
        updatedAt: db.serverDate(),
      },
    })
    return { code: 0, message: '已取消' }
  } catch (e) {
    return { code: 1, message: e.message }
  }
}
