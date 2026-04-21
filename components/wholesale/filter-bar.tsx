"use client"

import { useState } from "react"
import { ArrowUpDown, SlidersHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"

const SORTS = [
  { key: "default", label: "综合" },
  { key: "sales", label: "销量" },
  { key: "price", label: "价格" },
  { key: "new", label: "新品" },
]

export function FilterBar() {
  const [active, setActive] = useState("default")

  return (
    <div className="flex h-9 items-center justify-between border-b border-divider bg-background px-3 text-[12px]">
      <ul className="flex items-center gap-4">
        {SORTS.map((s) => (
          <li key={s.key}>
            <button
              type="button"
              onClick={() => setActive(s.key)}
              className={cn(
                "flex items-center gap-0.5 leading-none transition-colors",
                active === s.key
                  ? "font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {s.label}
              {s.key === "price" ? (
                <ArrowUpDown className="h-3 w-3" aria-hidden="true" />
              ) : null}
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
      >
        <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
        筛选
      </button>
    </div>
  )
}
