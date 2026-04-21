import { Search, ScanLine } from "lucide-react"

export function TopBar() {
  return (
    <header className="bg-background">
      {/* 小程序胶囊状态栏占位 */}
      <div className="flex h-11 items-center justify-between px-4 text-[13px] font-medium text-foreground">
        <span className="tabular-nums">9:41</span>
        <span className="tracking-wide">批发大厅</span>
        <span className="text-muted-foreground">···○</span>
      </div>

      {/* 搜索框 */}
      <div className="px-3 pb-2">
        <div className="flex h-9 items-center gap-2 rounded-full border border-divider bg-muted px-3">
          <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <input
            type="search"
            placeholder="搜索商品名 / 货号 / 器型"
            aria-label="搜索商品"
            className="h-full flex-1 bg-transparent text-[13px] leading-none text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <ScanLine className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </div>
      </div>
    </header>
  )
}
