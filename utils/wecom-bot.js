// utils/wecom-bot.js
// =====================================================
// 企业微信群机器人 Webhook 消息发送
// 用于 B2B 批发端：提交采购单后通知客服对接企业客户
// =====================================================

const WEBHOOK_BASE = 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key='

function getBotKey() {
  const app = getApp()
  if (app && typeof app.getWecomBotKey === 'function') return app.getWecomBotKey()
  return wx.getStorageSync('wecom_bot_key') || ''
}

function getWebhookUrl() {
  const key = getBotKey()
  if (!key) return ''
  if (/^https?:\/\//.test(key)) return key
  return WEBHOOK_BASE + key
}

function normalizeSpec(spec) {
  if (!spec) return ''
  if (typeof spec === 'string') {
    try {
      const obj = JSON.parse(spec)
      return Object.keys(obj).map((k) => `${k}:${obj[k]}`).join(' / ')
    } catch (e) {
      return spec
    }
  }
  if (typeof spec === 'object') {
    return Object.keys(spec).map((k) => `${k}:${spec[k]}`).join(' / ')
  }
  return String(spec)
}

function sendMarkdown(content) {
  const url = getWebhookUrl()
  if (!url) {
    return Promise.reject(new Error('企业微信机器人未配置'))
  }
  return new Promise((resolve, reject) => {
    wx.request({
      url,
      method: 'POST',
      header: { 'Content-Type': 'application/json' },
      data: {
        msgtype: 'markdown',
        markdown: { content },
      },
      success(res) {
        if (res.data && res.data.errcode === 0) {
          resolve(res.data)
        } else {
          reject(new Error((res.data && res.data.errmsg) || '企微通知发送失败'))
        }
      },
      fail(err) {
        reject(err)
      },
    })
  })
}

function buildPurchaseMarkdown(orderInfo) {
  const {
    orderNo,
    customerName,
    customerPhone,
    address,
    companyName,
    items = [],
    subtotal,
    freight,
    total,
    remark,
    time,
  } = orderInfo

  let md = `## 新B2B采购单\n`
  md += `> 订单编号：<font color="comment">${orderNo || '待系统生成'}</font>\n`
  md += `> 提交时间：<font color="comment">${time || ''}</font>\n`
  md += `> 处理方式：<font color="warning">无需线上支付，请客服对接企业确认</font>\n\n`

  md += `**客户信息**\n`
  if (companyName) md += `> 企业/客户：${companyName}\n`
  md += `> 联系人：${customerName || '未填写'}\n`
  md += `> 电话：${customerPhone || '未填写'}\n`
  if (address) md += `> 地址：${address}\n`
  md += `\n`

  md += `**采购清单**（共 ${items.length} 种）\n`
  items.forEach((item, idx) => {
    const spec = normalizeSpec(item.skuSpec || item.spec)
    const specText = spec ? ` [${spec}]` : ''
    md += `> ${idx + 1}. ${item.name || item.productName}${specText} × ${item.qty}${item.unit || '件'}  ¥${Number(item.price || item.unitPrice || 0).toFixed(2)}\n`
    if (item.skuImage || item.image) md += `> 规格图：${item.skuImage || item.image}\n`
  })
  md += `\n`

  md += `> 商品小计：¥${Number(subtotal || 0).toFixed(2)}\n`
  md += `> 预估运费：¥${Number(freight || 0).toFixed(2)}\n`
  md += `**预估合计：<font color="warning">¥${Number(total || 0).toFixed(2)}</font>**\n`
  if (remark) md += `\n> 客户备注：${remark}\n`

  md += `\n---\n请客服尽快联系企业客户确认规格、数量、交期和线下结算方式。`
  return md
}

function submitPurchase(orderInfo) {
  const content = buildPurchaseMarkdown(orderInfo)
  return sendMarkdown(content)
}

module.exports = {
  sendMarkdown,
  buildPurchaseMarkdown,
  submitPurchase,
}
