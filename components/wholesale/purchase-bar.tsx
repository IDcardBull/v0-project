import { ClipboardList, FileText, Headphones } from "lucide-react"

export function PurchaseBar() {
  return (
    <div className="border-t border-divider bg-background">
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          className="flex h-10 w-10 flex-col items-center justify-center text-[10px] text-muted-foreground"
          aria-label="客服"
        >
          <Headphones className="h-5 w-5" aria-hidden="true" />
          <span>客服</span>
        </button>
        <button
          type="button"
          className="relative flex h-10 w-10 flex-col items-center justify-center text-[10px] text-muted-foreground"
          aria-label="采购单"
        >
          <ClipboardList className="h-5 w-5" aria-hidden="true" />
          <span>采购单</span>
          <span
            aria-label="采购单中有 3 件商品"
            className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-price px-1 text-[10px] font-medium leading-none text-background"
          >
            3
          </span>
        </button>

        <div className="ml-1 flex flex-1 items-baseline gap-2 rounded-md border border-divider bg-muted px-3 py-2">
          <span className="text-[11px] text-muted-foreground">预估金额</span>
          <span className="text-[16px] font-bold leading-none text-price tabular-nums">
            <span className="text-[11px] font-normal">¥</span>
            3,486.00
          </span>
          <span className="ml-auto text-[11px] text-muted-foreground">已选 84 件</span>
        </div>

        <button
          type="button"
          className="inline-flex h-10 items-center gap-1 rounded-md bg-brand px-4 text-[13px] font-medium text-brand-foreground transition-colors hover:bg-brand/90 active:bg-brand/80"
        >
          <FileText className="h-4 w-4" aria-hidden="true" />
          生成询价单
        </button>
      </div>
    </div>
  )
}
