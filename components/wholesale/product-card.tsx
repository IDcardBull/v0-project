"use client"

import { useState } from "react"
import Image from "next/image"
import { ShoppingCart } from "lucide-react"
import { cn } from "@/lib/utils"
import { QuantityStepper } from "./quantity-stepper"

export type TierPrice = { min: number; max?: number; price: number }

export type Product = {
  id: string
  name: string
  image: string
  stockTag: "现货" | "预售" | "特惠"
  tags: string[]
  sku: string
  moq: number
  unit: string
  tiers: TierPrice[]
  sold?: string
}

function formatRange(t: TierPrice, unit: string) {
  if (t.max) return `${t.min}-${t.max}${unit}`
  return `≥${t.min}${unit}`
}

function formatPrice(p: number) {
  return p.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

const STOCK_STYLES: Record<Product["stockTag"], string> = {
  现货: "bg-brand/85 text-brand-foreground",
  预售: "bg-foreground/75 text-background",
  特惠: "bg-price/90 text-background",
}

export function ProductCard({ product }: { product: Product }) {
  const [qty, setQty] = useState(0)
  const inCart = qty > 0

  return (
    <article className="flex gap-3 border-b border-divider bg-background px-3 py-3">
      {/* 左侧商品主图 */}
      <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-md bg-muted">
        <Image
          src={product.image || "/placeholder.svg"}
          alt={product.name}
          fill
          sizes="112px"
          className="object-cover"
        />
        <span
          className={cn(
            "absolute left-0 top-0 rounded-br-md px-1.5 py-0.5 text-[10px] font-medium leading-none backdrop-blur-sm",
            STOCK_STYLES[product.stockTag],
          )}
        >
          {product.stockTag}
        </span>
        {product.sold ? (
          <span className="absolute bottom-0 left-0 right-0 bg-foreground/55 px-1.5 py-0.5 text-[10px] leading-none text-background backdrop-blur-sm">
            近30日售出 {product.sold}
          </span>
        ) : null}
      </div>

      {/* 右侧信息区 */}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {/* 标题 */}
        <h3 className="line-clamp-2 text-[14px] font-bold leading-snug text-foreground">
          {product.name}
        </h3>

        {/* 参数标签 */}
        <ul className="flex flex-wrap items-center gap-1">
          {product.tags.map((t) => (
            <li
              key={t}
              className="rounded-sm border border-divider bg-muted px-1.5 py-[1px] text-[10px] leading-tight text-muted-foreground"
            >
              {t}
            </li>
          ))}
          <li className="ml-auto text-[10px] tabular-nums text-muted-foreground/80">
            {product.sku}
          </li>
        </ul>

        {/* 关键信息区：起批量 + 阶梯价 */}
        <div className="mt-0.5 rounded-md border border-divider bg-brand-soft/60 px-2 py-1.5">
          <div className="flex items-center gap-1 text-[11px] leading-none text-brand">
            <span className="rounded-sm bg-brand px-1 py-[2px] text-[10px] font-medium text-brand-foreground">
              起批
            </span>
            <span className="font-medium tabular-nums">
              ≥ {product.moq} {product.unit}
            </span>
            <span className="text-brand/60">· 支持混批</span>
          </div>

          <div className="mt-1.5 grid grid-cols-2 gap-x-2 gap-y-0.5">
            {product.tiers.map((t) => (
              <div
                key={t.min}
                className="flex items-baseline justify-between border-b border-dashed border-brand/20 py-[2px] last:border-b-0"
              >
                <span className="text-[11px] leading-none text-muted-foreground tabular-nums">
                  {formatRange(t, product.unit)}
                </span>
                <span className="text-[13px] font-bold leading-none text-price tabular-nums">
                  <span className="text-[10px] font-normal">¥</span>
                  {formatPrice(t.price)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 底部操作区 */}
        <div className="mt-0.5 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">
            含税价 · 满 1000{product.unit} 免邮
          </span>
          {inCart ? (
            <QuantityStepper value={qty} onChange={setQty} min={0} />
          ) : (
            <button
              type="button"
              onClick={() => setQty(product.moq)}
              className="inline-flex h-7 items-center gap-1 rounded-md bg-brand px-2.5 text-[12px] font-medium text-brand-foreground transition-colors hover:bg-brand/90 active:bg-brand/80"
            >
              <ShoppingCart className="h-3.5 w-3.5" aria-hidden="true" />
              加入采购单
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
