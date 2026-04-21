"use client"

import { Minus, Plus } from "lucide-react"

type Props = {
  value: number
  onChange: (v: number) => void
  min?: number
  step?: number
}

export function QuantityStepper({ value, onChange, min = 0, step = 1 }: Props) {
  const dec = () => onChange(Math.max(min, value - step))
  const inc = () => onChange(value + step)

  return (
    <div className="flex h-7 items-stretch overflow-hidden rounded-md border border-divider">
      <button
        type="button"
        onClick={dec}
        aria-label="减少数量"
        disabled={value <= min}
        className="flex w-7 items-center justify-center text-foreground transition-colors hover:bg-muted disabled:text-muted-foreground/50"
      >
        <Minus className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(e) => {
          const n = Number.parseInt(e.target.value.replace(/\D/g, ""), 10)
          onChange(Number.isNaN(n) ? min : Math.max(min, n))
        }}
        aria-label="采购数量"
        className="w-10 border-x border-divider bg-background text-center text-[13px] tabular-nums text-foreground focus:outline-none"
      />
      <button
        type="button"
        onClick={inc}
        aria-label="增加数量"
        className="flex w-7 items-center justify-center text-foreground transition-colors hover:bg-muted"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  )
}
