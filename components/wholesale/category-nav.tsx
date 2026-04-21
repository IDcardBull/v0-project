"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

const CATEGORIES = [
  { key: "all", label: "全部", count: 2180 },
  { key: "tea-set", label: "茶具套装", count: 326 },
  { key: "cup", label: "单品茶杯", count: 942 },
  { key: "gaiwan", label: "盖碗公道", count: 187 },
  { key: "bowl", label: "日用餐具", count: 401 },
  { key: "craft", label: "工艺件", count: 210 },
  { key: "custom", label: "定制专区", count: 114 },
]

export function CategoryNav() {
  const [active, setActive] = useState("tea-set")

  return (
    <nav
      aria-label="商品分类"
      className="border-b border-divider bg-background"
    >
      <ul className="flex items-stretch gap-1 overflow-x-auto px-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {CATEGORIES.map((c) => {
          const isActive = active === c.key
          return (
            <li key={c.key} className="shrink-0">
              <button
                type="button"
                onClick={() => setActive(c.key)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative flex h-10 items-center gap-1 px-3 text-[13px] transition-colors",
                  isActive
                    ? "font-medium text-brand"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span>{c.label}</span>
                <span
                  className={cn(
                    "text-[11px] tabular-nums",
                    isActive ? "text-brand/70" : "text-muted-foreground/70",
                  )}
                >
                  {c.count}
                </span>
                {isActive ? (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-3 bottom-0 h-[2px] rounded-full bg-brand"
                  />
                ) : null}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
