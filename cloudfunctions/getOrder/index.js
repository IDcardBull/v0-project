// 云函数：getOrder - 查询当前用户的订单详情
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
    return { code: 0, data: { ...order, id: order._id } }
  } catch (e) {
    return { code: 1, message: e.message }
  }
}
