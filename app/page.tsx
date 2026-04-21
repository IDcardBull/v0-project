import { TopBar } from "@/components/wholesale/top-bar"
import { CategoryNav } from "@/components/wholesale/category-nav"
import { FilterBar } from "@/components/wholesale/filter-bar"
import { ProductCard } from "@/components/wholesale/product-card"
import { PurchaseBar } from "@/components/wholesale/purchase-bar"
import { PRODUCTS } from "@/components/wholesale/products-data"

export default function Page() {
  return (
    <main className="min-h-screen bg-muted/40 py-6 md:py-10">
      {/* 页面标题（仅大屏预览展示） */}
      <div className="mx-auto mb-6 hidden max-w-md px-4 md:block">
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          央茗陶瓷 · 微信小程序
        </p>
        <h1 className="mt-1 text-xl font-bold text-foreground">批发大厅 · 商家采购入口</h1>
        <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
          面向 B2B 大宗采购客户，展示规格、起批量与阶梯价，一屏高效比价下单。
        </p>
      </div>

      {/* 小程序手机壳 */}
      <div className="mx-auto w-full max-w-[390px] overflow-hidden border border-divider bg-background shadow-sm md:rounded-[28px] md:shadow-xl">
        <div className="flex h-[780px] flex-col">
          <TopBar />
          <CategoryNav />
          <FilterBar />

          <div className="flex-1 overflow-y-auto">
            <section aria-label="批发商品列表">
              {PRODUCTS.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}

              <div className="px-3 py-6 text-center text-[11px] text-muted-foreground">
                —— 已展示 {PRODUCTS.length} 款，下拉加载更多 ——
              </div>
            </section>
          </div>

          <PurchaseBar />
        </div>
      </div>
    </main>
  )
}
