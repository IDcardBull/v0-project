// 生成 4 个 tabBar 图标（normal + active 共 8 个 PNG），统一线性风格
const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const SIZE = 81
const STROKE = 6
const OUT_DIR = '/vercel/share/v0-project/images/tabbar'

// 居中视图框 24x24，方便描述路径
const ICONS = {
  home: `<path d="M3 11 L12 3 L21 11 V21 H14 V14 H10 V21 H3 Z" fill="none" stroke="{C}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`,
  category: `
    <rect x="3"  y="3"  width="8" height="8" rx="1" fill="none" stroke="{C}" stroke-width="2"/>
    <rect x="13" y="3"  width="8" height="8" rx="1" fill="none" stroke="{C}" stroke-width="2"/>
    <rect x="3"  y="13" width="8" height="8" rx="1" fill="none" stroke="{C}" stroke-width="2"/>
    <rect x="13" y="13" width="8" height="8" rx="1" fill="none" stroke="{C}" stroke-width="2"/>
  `,
  cart: `
    <path d="M3 4 H6 L8 16 H19 L21 8 H7" fill="none" stroke="{C}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="9"  cy="20" r="1.6" fill="{C}"/>
    <circle cx="18" cy="20" r="1.6" fill="{C}"/>
  `,
  profile: `
    <circle cx="12" cy="8" r="4" fill="none" stroke="{C}" stroke-width="2"/>
    <path d="M4 21 C4 16 8 14 12 14 C16 14 20 16 20 21" fill="none" stroke="{C}" stroke-width="2" stroke-linecap="round"/>
  `,
}

function makeSvg(body, color) {
  const inner = body.replace(/\{C\}/g, color)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 24 24">${inner}</svg>`
}

;(async () => {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true })

  // 清掉所有旧 jpg / png
  for (const f of fs.readdirSync(OUT_DIR)) {
    if (/\.(jpg|png)$/i.test(f)) fs.unlinkSync(path.join(OUT_DIR, f))
  }

  for (const [name, body] of Object.entries(ICONS)) {
    for (const [suffix, color] of [['', '#888888'], ['-active', '#3c5a6f']]) {
      const svg = makeSvg(body, color)
      const file = path.join(OUT_DIR, `${name}${suffix}.png`)
      await sharp(Buffer.from(svg))
        .resize(SIZE, SIZE)
        .png({ palette: true, compressionLevel: 9 })
        .toFile(file)
      console.log(`${path.basename(file)}: ${fs.statSync(file).size} bytes`)
    }
  }
})()
