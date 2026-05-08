// 云函数：submitOrder
// 创建订单 + 通过企业微信群机器人发送通知
const cloud = require('wx-server-sdk')
const https = require('https')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

// ========== 工具：发起 https POST ==========
function httpsPostJson(url, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url)
    const data = Buffer.from(JSON.stringify(body))
    const req = https.request(
      {
        hostname: u.hostname,
        port: 443,
        path: u.pathname + u.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Length': data.length,
        },
        timeout: 5000,
      },
      (res) => {
        let chunks = ''
        res.on('data', (c) => (chunks += c))
        res.on('end', () => {
          try {
            resolve(JSON.parse(chunks))
          } catch (e) {
            resolve(chunks)
          }
        })
      },
    )
    req.on('error', reject)
    req.on('timeout', () => {
      req.destroy(new Error('webhook timeout'))
    })
    req.write(data)
    req.end()
  })
}

// ========== 工具：生成订单号 YM + yyyyMMdd + 6 位随机 ==========
function genOrderNo() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const date = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
  const rnd = String(Math.floor(Math.random() * 1000000)).padStart(6, '0')
  return `YM${date}${rnd}`
}

// ========== 工具：拼接企业微信 Markdown 消息 ==========
function buildMarkdown(order) {
  const lines = []
  lines.push(`### 央茗陶瓷 · 新订单到达`)
  lines.push(`> **订单号**：\`${order.orderNo}\``)
  lines.push(`> **下单时间**：${new Date().toLocaleString('zh-CN', { hour12: false })}`)
  lines.push(`> **下单人**：${(order.user && order.user.nickname) || '匿名客户'}`)
  if (order.user && order.user.phone) {
    lines.push(`> **联系电话**：${order.user.phone}`)
  }
  lines.push(`> **收货人**：${order.address.contact} ${order.address.phone}`)
  lines.push(
    `> **收货地址**：${order.address.province}${order.address.city}${order.address.district || ''}${order.address.detail}`,
  )
  lines.push(`---`)
  lines.push(`**商品清单（共 ${order.totalQty} 件）：**`)
  order.items.forEach((it, idx) => {
    const spec = it.spec ? ` · ${it.spec}` : ''
    lines.push(`${idx + 1}. ${it.name}${spec} × ${it.qty} <font color="warning">¥${it.price}</font>`)
  })
  lines.push(`---`)
  lines.push(`**合计金额：<font color="warning">¥${order.totalAmount}</font>**`)
  if (order.remark) {
    lines.push(`> **客户备注**：${order.remark}`)
  }
  lines.push(`> 请尽快处理 [查看订单详情](#)`)
  return lines.join('\n')
}

async function notifyWeCom(order) {
  // TODO：部署时在云函数环境变量中配置 WECOM_BOT_KEY
  const key = process.env.WECOM_BOT_KEY
  if (!key) {
    console.log('[submitOrder] WECOM_BOT_KEY 未配置，跳过群通知')
    return false
  }
  const url = `https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=${key}`
  try {
    const res = await httpsPostJson(url, {
      msgtype: 'markdown',
      markdown: { content: buildMarkdown(order) },
    })
    if (res && res.errcode === 0) return true
    console.log('[submitOrder] 群机器人返回异常', res)
    return false
  } catch (e) {
    console.log('[submitOrder] 调用机器人失败', e.message)
    return false
  }
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { items = [], address, remark = '', user = null } = event

  // ========== 入参校验 ==========
  if (!Array.isArray(items) || items.length === 0) {
    return { code: 1, message: '订单商品不能为空' }
  }
  if (!address || !address.contact || !address.phone || !address.detail) {
    return { code: 1, message: '收货地址不完整' }
  }
  for (const it of items) {
    if (!it.name || !it.qty || it.qty <= 0 || it.price == null) {
      return { code: 1, message: '商品数据不完整' }
    }
  }

  // ========== 计算金额 ==========
  const goodsAmount = Number(
    items
      .reduce((s, i) => s + Number(i.price) * Number(i.qty), 0)
      .toFixed(2),
  )
  const shippingFee = 0
  const totalAmount = Number((goodsAmount + shippingFee).toFixed(2))
  const totalQty = items.reduce((s, i) => s + Number(i.qty), 0)

  const now = db.serverDate()
  const orderNo = genOrderNo()

  const orderDoc = {
    _openid: openid,
    orderNo,
    status: 'pending', // 待确认
    items: items.map((i) => ({
      productId: i.productId || null,
      skuId: i.skuId || null,
      name: i.name,
      spec: i.spec || '',
      image: i.image || '',
      price: Number(i.price),
      qty: Number(i.qty),
      lineTotal: Number((Number(i.price) * Number(i.qty)).toFixed(2)),
    })),
    totalQty,
    goodsAmount,
    shippingFee,
    totalAmount,
    address: {
      contact: address.contact,
      phone: address.phone,
      province: address.province || '',
      city: address.city || '',
      district: address.district || '',
      detail: address.detail,
    },
    user: user || null,
    remark: remark || '',
    notifySent: false,
    createdAt: now,
    updatedAt: now,
  }

  // ========== 写入数据库 ==========
  const { _id } = await db.collection('orders').add({ data: orderDoc })

  // ========== 发企业微信通知（异步，不阻塞返回）==========
  const notified = await notifyWeCom({
    ...orderDoc,
    createdAt: new Date(),
  })

  if (notified) {
    await db.collection('orders').doc(_id).update({
      data: { notifySent: true, notifiedAt: db.serverDate() },
    })
  }

  return {
    code: 0,
    message: '下单成功',
    data: { id: _id, orderNo, status: 'pending', totalAmount },
  }
}
