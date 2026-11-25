import React from "react";
import { usePos } from "../../context/PosContext";
import { formatTL, formatDateShort } from "../../utils/formatters";
import {
  Download,
  TrendingUp,
  ArrowUpRight,
  DollarSign,
  ShoppingBag,
  Flame,
  Search,
  Eye,
  Trash2
} from "../Icons";

export function AnalyticsView() {
  const {
    analyticsSubTab,
    setAnalyticsSubTab,
    exportExcelByCategory,
    kpiMetrics,
    topProducts,
    globalPeriod,
    trendChartData,
    reportProductSearch,
    setReportProductSearch,
    reportProductCategory,
    setReportProductCategory,
    categories,
    reportProductSort,
    setReportProductSort,
    reportReceiptSearch,
    setReportReceiptSearch,
    reportReceiptMethod,
    setReportReceiptMethod,
    reportReceiptStaff,
    setReportReceiptStaff,
    staffList,
    filteredSales,
    setInspectedSale,
    handleDeleteSaleReceipt,
    reportExpenseSearch,
    setReportExpenseSearch,
    reportExpenseCategory,
    setReportExpenseCategory,
    filteredExpenses,
    setExpenses
  } = usePos();

  const renderTrendChart = () => {
    const data = trendChartData.length > 0 ? trendChartData : [{ name: "-", Ciro: 0, Gider: 0 }];
    const maxVal = Math.max(100, ...data.map((d) => Math.max(d.Ciro || 0, d.Gider || 0))) * 1.15;
    const svgW = 760;
    const svgH = 250;
    const padLeft = 56;
    const padRight = 24;
    const padTop = 20;
    const padBottom = 34;
    const chartW = svgW - padLeft - padRight;
    const chartH = svgH - padTop - padBottom;
    const getX = (idx) => padLeft + (data.length <= 1 ? chartW / 2 : (idx / (data.length - 1)) * chartW);
    const getY = (val) => padTop + chartH - Math.min(1, Math.max(0, (val || 0) / maxVal)) * chartH;

    const buildSmoothPath = (points) => {
      if (points.length === 0) return "";
      if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
      let path = `M ${points[0].x} ${points[0].y}`;
      for (let i = 0; i < points.length - 1; i++) {
        const curr = points[i];
        const next = points[i + 1];
        const ctrlX1 = curr.x + (next.x - curr.x) / 2;
        const ctrlY1 = curr.y;
        const ctrlX2 = curr.x + (next.x - curr.x) / 2;
        const ctrlY2 = next.y;
        path += ` C ${ctrlX1} ${ctrlY1}, ${ctrlX2} ${ctrlY2}, ${next.x} ${next.y}`;
      }
      return path;
    };

    const ciroPts = data.map((d, idx) => ({ x: getX(idx), y: getY(d.Ciro || 0), val: d.Ciro || 0, name: d.name }));
    const giderPts = data.map((d, idx) => ({ x: getX(idx), y: getY(d.Gider || 0), val: d.Gider || 0, name: d.name }));
    const ciroLine = buildSmoothPath(ciroPts);
    const ciroArea = `${ciroLine} L ${ciroPts[ciroPts.length - 1].x} ${padTop + chartH} L ${ciroPts[0].x} ${padTop + chartH} Z`;
    const giderLine = buildSmoothPath(giderPts);
    const giderArea = `${giderLine} L ${giderPts[giderPts.length - 1].x} ${padTop + chartH} L ${giderPts[0].x} ${padTop + chartH} Z`;
    const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
      val: Math.round(maxVal * t),
      y: padTop + chartH - t * chartH
    }));

    return (
      <div className="relative w-full bg-stone-950/80 rounded-2xl border border-stone-800/80 p-2 sm:p-3 overflow-hidden">
        <svg viewBox={`0 0 ${svgW} ${svgH}`} preserveAspectRatio="xMidYMid meet" className="w-full h-48 sm:h-64 overflow-visible">
          <defs>
            <linearGradient id="ciroAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.48" />
              <stop offset="65%" stopColor="#ea580c" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#ea580c" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="giderAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="ciroStrokeGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#ea580c" />
            </linearGradient>
          </defs>

          {yTicks.map((tk, i) => (
            <g key={i}>
              <line
                x1={padLeft}
                y1={tk.y}
                x2={svgW - padRight}
                y2={tk.y}
                stroke="#292524"
                strokeDasharray={i === 0 ? "none" : "4 4"}
                strokeWidth="1"
              />
              <text x={padLeft - 8} y={tk.y + 4} textAnchor="end" className="fill-stone-500 text-[10px] font-semibold">
                {tk.val >= 1000 ? `${(tk.val / 1000).toFixed(1)}k ₺` : `${tk.val} ₺`}
              </text>
            </g>
          ))}

          {globalPeriod !== "daily" && (
            <>
              <path d={giderArea} fill="url(#giderAreaGrad)" />
              <path d={giderLine} fill="none" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" />
            </>
          )}

          <path d={ciroArea} fill="url(#ciroAreaGrad)" />
          <path d={ciroLine} fill="none" stroke="url(#ciroStrokeGrad)" strokeWidth="3.5" strokeLinecap="round" />

          {ciroPts.map((pt, idx) => (
            <g key={idx} className="group cursor-pointer">
              <line
                x1={pt.x}
                y1={padTop}
                x2={pt.x}
                y2={padTop + chartH}
                stroke="#f59e0b"
                strokeWidth="1"
                strokeDasharray="3 3"
                className="opacity-0 group-hover:opacity-60 transition-opacity"
              />
              {globalPeriod !== "daily" && giderPts[idx] && (
                <circle
                  cx={giderPts[idx].x}
                  cy={giderPts[idx].y}
                  r="4"
                  className="fill-stone-950 stroke-rose-500 stroke-2 group-hover:r-6 transition-all"
                />
              )}
              <circle
                cx={pt.x}
                cy={pt.y}
                r="4.5"
                className="fill-stone-950 stroke-amber-400 stroke-[2.5] group-hover:scale-150 transition-transform origin-center"
              />
              <text
                x={pt.x}
                y={svgH - 10}
                textAnchor="middle"
                className="fill-stone-400 group-hover:fill-amber-300 text-[10px] font-medium transition-colors"
              >
                {pt.name}
              </text>
              <g className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <rect
                  x={Math.min(svgW - 145, Math.max(padLeft, pt.x - 65))}
                  y={Math.max(4, pt.y - 54)}
                  width="130"
                  height={globalPeriod !== "daily" ? "44" : "32"}
                  rx="8"
                  fill="#141210"
                  stroke="#f59e0b"
                  strokeWidth="1"
                />
                <text
                  x={Math.min(svgW - 80, Math.max(padLeft + 65, pt.x))}
                  y={Math.max(19, pt.y - 38)}
                  textAnchor="middle"
                  className="fill-amber-400 text-[10px] font-medium"
                >
                  {pt.name}: {formatTL(pt.val)}
                </text>
                {globalPeriod !== "daily" && giderPts[idx] && (
                  <text
                    x={Math.min(svgW - 80, Math.max(padLeft + 65, pt.x))}
                    y={Math.max(33, pt.y - 24)}
                    textAnchor="middle"
                    className="fill-rose-400 text-[9px] font-medium"
                  >
                    Gider: -{formatTL(giderPts[idx].val)}
                  </text>
                )}
              </g>
            </g>
          ))}
        </svg>
      </div>
    );
  };

  const renderPaymentDonut = () => {
    const channels = [
      { label: "Kredi Kartı", amount: kpiMetrics.byMethod["Kredi Kartı"] || 0, color: "#f59e0b", badge: "bg-amber-500" },
      { label: "Nakit Kasa", amount: kpiMetrics.byMethod["Nakit"] || 0, color: "#10b981", badge: "bg-emerald-500" },
      { label: "Yemek Kartı", amount: kpiMetrics.byMethod["Yemek Kartı"] || 0, color: "#3b82f6", badge: "bg-blue-500" },
      { label: "Esnaf Cari", amount: kpiMetrics.byMethod["Esnaf Cariye Yazıldı"] || 0, color: "#f97316", badge: "bg-orange-500" }
    ];
    const totalVolume = Math.max(1, channels.reduce((s, c) => s + c.amount, 0));
    const radius = 58;
    const circumference = 2 * Math.PI * radius;
    let accumulatedPercent = 0;

    return (
      <div className="my-4 flex flex-col items-center">
        <div className="relative w-44 h-44 flex items-center justify-center">
          <svg viewBox="0 0 150 150" className="w-full h-full -rotate-90">
            <circle cx="75" cy="75" r={radius} fill="none" stroke="#1c1917" strokeWidth="18" />
            {channels.map((ch, idx) => {
              const pct = ch.amount / totalVolume;
              const strokeDasharray = `${pct * circumference} ${circumference}`;
              const strokeDashoffset = -accumulatedPercent * circumference;
              accumulatedPercent += pct;
              return (
                <circle
                  key={idx}
                  cx="75"
                  cy="75"
                  r={radius}
                  fill="none"
                  stroke={ch.color}
                  strokeWidth="18"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="butt"
                  className="transition-all duration-500 hover:opacity-85"
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2">
            <span className="text-[10px] font-medium uppercase text-stone-400">Toplam Hacim</span>
            <span className="text-base font-semibold text-white mt-0.5">
              {formatTL(kpiMetrics.grossRevenue + kpiMetrics.cariWrittenTotal)}
            </span>
          </div>
        </div>
        <div className="w-full space-y-2 mt-4">
          {channels.map((ch, i) => {
            const pct = Math.round((ch.amount / totalVolume) * 100);
            return (
              <div
                key={i}
                className="flex items-center justify-between text-xs px-3 py-2 rounded-xl bg-stone-950/70 border border-stone-800/80"
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${ch.badge}`} />
                  <span className="font-medium text-stone-200">{ch.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white">{formatTL(ch.amount)}</span>
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-stone-900 text-stone-400">
                    %{pct}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="p-3 rounded-2xl glass-panel border border-stone-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: "overview", label: "📊 Genel Özet & Grafikler" },
            { id: "products", label: "☕ Ürün Satış & Kâr Sıralaması" },
            { id: "receipts", label: "🧾 Adisyon & Satış Geçmişi" },
            { id: "expenses", label: "💸 Gider & Maliyet Dökümü" }
          ].map((sub) => (
            <button
              key={sub.id}
              onClick={() => setAnalyticsSubTab(sub.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
                analyticsSubTab === sub.id
                  ? "bg-amber-500 text-stone-950 shadow"
                  : "bg-stone-900 text-stone-400 hover:text-white border border-stone-800"
              }`}
            >
              {sub.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => exportExcelByCategory(analyticsSubTab)}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-medium text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition-all"
        >
          <Download className="w-4 h-4" />
          {analyticsSubTab === "overview" && "Genel Bilanço Özeti Excel İndir (.XLS)"}
          {analyticsSubTab === "products" && "Ürün Satış Tablosu Excel İndir (.XLS)"}
          {analyticsSubTab === "receipts" && "Adisyon Geçmişi Excel İndir (.XLS)"}
          {analyticsSubTab === "expenses" && "Gider & Fatura Tablosu Excel İndir (.XLS)"}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="pos-card-hover p-5 rounded-2xl glass-panel border border-emerald-500/30 relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-emerald-500/10 blur-xl pointer-events-none" />
          <div className="flex items-center justify-between text-xs text-stone-400 font-semibold">
            <span>SEÇİLİ DÖNEM BRÜT CİRO</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white mt-2 tracking-tight">{formatTL(kpiMetrics.grossRevenue)}</p>
          <p className="text-xs text-emerald-400 font-semibold mt-1.5 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            {kpiMetrics.orderCount} Adisyon • +{formatTL(kpiMetrics.cariWrittenTotal)} Cari
          </p>
        </div>

        <div className="pos-card-hover p-5 rounded-2xl glass-panel border border-amber-500/30 relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-amber-500/10 blur-xl pointer-events-none" />
          <div className="flex items-center justify-between text-xs text-stone-400 font-semibold">
            <span>NET İŞLETME KÂRI</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p
            className={`text-3xl font-bold mt-2 tracking-tight ${
              kpiMetrics.netProfit >= 0 ? "text-amber-400" : "text-rose-400"
            }`}
          >
            {formatTL(kpiMetrics.netProfit)}
          </p>
          <p className="text-xs text-stone-400 mt-1.5">
            Dönem Gideri: <span className="text-rose-400 font-semibold">-{formatTL(kpiMetrics.totalExpenses)}</span>
          </p>
        </div>

        <div className="pos-card-hover p-5 rounded-2xl glass-panel border border-blue-500/30 relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-blue-500/10 blur-xl pointer-events-none" />
          <div className="flex items-center justify-between text-xs text-stone-400 font-semibold">
            <span>ORTALAMA ADİSYON SEPETİ</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white mt-2 tracking-tight">{formatTL(kpiMetrics.avgTicket)}</p>
          <p className="text-xs text-blue-300/80 mt-1.5">Masa başı ortalama harcama</p>
        </div>

        <div className="pos-card-hover p-5 rounded-2xl glass-panel border border-orange-500/30 relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-orange-500/10 blur-xl pointer-events-none" />
          <div className="flex items-center justify-between text-xs text-stone-400 font-semibold">
            <span>DÖNEMİN LİDER ÜRÜNÜ</span>
            <div className="w-8 h-8 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-semibold text-amber-300 mt-2.5 truncate">
            {topProducts[0] ? `${topProducts[0].image} ${topProducts[0].name}` : "-"}
          </p>
          <p className="text-xs text-stone-300 mt-1 font-medium">
            {topProducts[0]
              ? `${topProducts[0].qty} Adet Satış • ${formatTL(topProducts[0].revenue)}`
              : "Henüz satış yok"}
          </p>
        </div>
      </div>

      {analyticsSubTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 p-6 rounded-2xl glass-panel border border-stone-800/90 shadow-2xl flex flex-col justify-between">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <div>
                  <span className="text-[10px] font-medium uppercase tracking-widest text-amber-400 block">
                    FİNANSAL PERFORMANS ANALİTİĞİ
                  </span>
                  <h3 className="text-lg font-semibold text-white mt-0.5">
                    {globalPeriod === "daily"
                      ? "Saatlik Canlı Ciro Akış Grafiği"
                      : "Ciro & İşletme Gideri Karşılaştırma Eğrisi"}
                  </h3>
                </div>
                <div className="flex items-center gap-4 text-xs bg-stone-950/80 px-3.5 py-2 rounded-xl border border-stone-800">
                  <span className="flex items-center gap-2 text-amber-300 font-medium">
                    <span className="w-3 h-3 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 shadow-sm shadow-amber-500" />
                    Brüt Ciro
                  </span>
                  {globalPeriod !== "daily" && (
                    <span className="flex items-center gap-2 text-rose-400 font-medium">
                      <span className="w-3 h-3 rounded-full bg-rose-500 shadow-sm shadow-rose-500" />
                      Giderler
                    </span>
                  )}
                </div>
              </div>
              {renderTrendChart()}
            </div>

            <div className="lg:col-span-4 p-6 rounded-2xl glass-panel border border-stone-800/90 shadow-2xl flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-medium uppercase tracking-widest text-amber-400 block">
                  TAHSİLAT KOMPOZİSYONU
                </span>
                <h3 className="text-lg font-semibold text-white mt-0.5">Ödeme Yöntemi Dağılımı</h3>
                <p className="text-xs text-stone-400">Nakit, Kart, Yemek Kartı ve Cari oranları</p>
              </div>
              {renderPaymentDonut()}
            </div>
          </div>

          <div className="p-6 rounded-2xl glass-panel border border-stone-800/90 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-[10px] font-medium uppercase tracking-widest text-amber-400 block">
                  ÜRÜN PERFORMANS LİDERLERİ
                </span>
                <h3 className="text-base font-semibold text-white flex items-center gap-2 mt-0.5">
                  <Flame className="w-4 h-4 text-amber-500" /> En Çok Tercih Edilen İlk 8 Ürün
                </h3>
              </div>
              <button
                onClick={() => setAnalyticsSubTab("products")}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-stone-950 text-xs font-medium transition-all"
              >
                Tüm Ürün Analizini Aç ➔
              </button>
            </div>

            {topProducts.length === 0 ? (
              <p className="text-xs text-stone-500 py-8 text-center">Bu tarih aralığında ürün satışı bulunamadı.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {topProducts.slice(0, 8).map((item, idx) => (
                  <div key={item.id} className="p-3.5 rounded-xl bg-stone-950/70 border border-stone-800/80 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-stone-950 font-medium flex items-center justify-center text-[11px]">
                          #{idx + 1}
                        </span>
                        <span className="text-lg">{item.image}</span>
                        <div>
                          <span className="font-medium text-white block">{item.name}</span>
                          <span className="text-[10px] text-stone-400">
                            {item.category} • Net Kâr: {formatTL(item.profit)}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-medium text-amber-400 block">{item.qty} Adet</span>
                        <span className="text-[11px] font-medium text-stone-300">{formatTL(item.revenue)}</span>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-stone-900 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(8, item.share)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {analyticsSubTab === "products" && (
        <div className="p-5 rounded-2xl bg-[#161412] border border-stone-800 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-white">Ürün Bazlı Satış Adedi, Ciro ve Net Kâr Analizi</h3>
              <p className="text-xs text-stone-400">
                Hangi üründen kaç adet satıldığını, maliyetini ve bıraktığı net kârı filtreleyin
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={reportProductSearch}
                  onChange={(e) => setReportProductSearch(e.target.value)}
                  placeholder="Ürün adı ara..."
                  className="bg-stone-900 border border-stone-800 rounded-xl pl-8 pr-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <select
                value={reportProductCategory}
                onChange={(e) => setReportProductCategory(e.target.value)}
                className="bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-white"
              >
                <option value="Tümü">Tüm Kategoriler</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <select
                value={reportProductSort}
                onChange={(e) => setReportProductSort(e.target.value)}
                className="bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-amber-400 font-medium"
              >
                <option value="qty">Sırala: En Çok Satan (Adet)</option>
                <option value="revenue">Sırala: En Yüksek Ciro (TL)</option>
                <option value="profit">Sırala: En Yüksek Net Kâr (TL)</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-stone-800 text-stone-400 uppercase">
                  <th className="py-3 px-3">#</th>
                  <th className="py-3 px-3">Ürün Adı</th>
                  <th className="py-3 px-3">Kategori</th>
                  <th className="py-3 px-3 text-right">Satılan Adet</th>
                  <th className="py-3 px-3 text-right">Toplam Ciro</th>
                  <th className="py-3 px-3 text-right">Tahmini Reçete Maliyeti</th>
                  <th className="py-3 px-3 text-right">Bıraktığı Net Kâr</th>
                  <th className="py-3 px-3 text-right">Ciro Payı</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60">
                {topProducts
                  .filter(
                    (p) =>
                      (reportProductCategory === "Tümü" || p.category === reportProductCategory) &&
                      p.name.toLowerCase().includes(reportProductSearch.toLowerCase())
                  )
                  .sort((a, b) => b[reportProductSort] - a[reportProductSort])
                  .map((item, idx) => (
                    <tr key={item.id} className="hover:bg-stone-900/60">
                      <td className="py-3 px-3 font-medium text-stone-500">{idx + 1}</td>
                      <td className="py-3 px-3 font-medium text-white flex items-center gap-2">
                        <span className="text-base">{item.image}</span>
                        <span>{item.name}</span>
                      </td>
                      <td className="py-3 px-3 text-stone-400">{item.category}</td>
                      <td className="py-3 px-3 text-right font-medium text-amber-400">{item.qty} Adet</td>
                      <td className="py-3 px-3 text-right font-medium text-white">{formatTL(item.revenue)}</td>
                      <td className="py-3 px-3 text-right text-rose-400">-{formatTL(item.costTotal)}</td>
                      <td className="py-3 px-3 text-right font-medium text-emerald-400">{formatTL(item.profit)}</td>
                      <td className="py-3 px-3 text-right text-stone-400">%{item.share}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {analyticsSubTab === "receipts" && (
        <div className="p-5 rounded-2xl bg-[#161412] border border-stone-800 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-white">Detaylı Adisyon & Satış Arama Motoru</h3>
              <p className="text-xs text-stone-400">
                Masa adı, ürün, çalışan veya ödeme yöntemine göre aradığınız fişi anında bulun
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="relative min-w-[220px]">
                <Search className="w-3.5 h-3.5 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={reportReceiptSearch}
                  onChange={(e) => setReportReceiptSearch(e.target.value)}
                  placeholder="Masa, ürün veya esnaf ara..."
                  className="w-full bg-stone-900 border border-stone-800 rounded-xl pl-8 pr-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <select
                value={reportReceiptMethod}
                onChange={(e) => setReportReceiptMethod(e.target.value)}
                className="bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-white"
              >
                <option value="Tümü">Tüm Ödeme Yöntemleri</option>
                <option value="Nakit">Nakit</option>
                <option value="Kredi Kartı">Kredi Kartı</option>
                <option value="Yemek Kartı">Yemek Kartı</option>
                <option value="Esnaf Cariye Yazıldı">Esnaf Cariye Yazıldı</option>
                <option value="İkram / İptal">İkram / İptal</option>
              </select>
              <select
                value={reportReceiptStaff}
                onChange={(e) => setReportReceiptStaff(e.target.value)}
                className="bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-white"
              >
                <option value="Tümü">Tüm Çalışanlar</option>
                {staffList.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-stone-800 text-stone-400 uppercase">
                  <th className="py-3 px-3">Tarih / Saat</th>
                  <th className="py-3 px-3">Masa / İşlem</th>
                  <th className="py-3 px-3">Çalışan</th>
                  <th className="py-3 px-3">Sipariş İçeriği</th>
                  <th className="py-3 px-3">Ödeme Yöntemi</th>
                  <th className="py-3 px-3 text-right">Tutar</th>
                  <th className="py-3 px-3 text-center">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60">
                {filteredSales
                  .filter((sale) => {
                    const matchMethod = reportReceiptMethod === "Tümü" || sale.paymentMethod === reportReceiptMethod;
                    const matchStaff = reportReceiptStaff === "Tümü" || sale.staffId === reportReceiptStaff;
                    const q = reportReceiptSearch.toLowerCase();
                    const matchText =
                      !q ||
                      sale.tableName.toLowerCase().includes(q) ||
                      sale.items.some((i) => i.name.toLowerCase().includes(q));
                    return matchMethod && matchStaff && matchText;
                  })
                  .slice(0, 60)
                  .map((sale) => {
                    const st = staffList.find((x) => x.id === sale.staffId);
                    return (
                      <tr key={sale.id} className="hover:bg-stone-900/50">
                        <td className="py-3 px-3 text-stone-300 whitespace-nowrap">{formatDateShort(sale.timestamp)}</td>
                        <td className="py-3 px-3 font-medium text-white">{sale.tableName}</td>
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center gap-1.5 font-medium text-stone-200">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: st?.color || "#f59e0b" }}
                            />
                            {st?.name || "Kasa"}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-stone-400 max-w-xs truncate">
                          {sale.items.map((i) => `${i.qty}x ${i.name}`).join(", ")}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${
                              sale.paymentMethod === "Nakit"
                                ? "bg-emerald-500/15 text-emerald-400"
                                : sale.paymentMethod === "Kredi Kartı"
                                ? "bg-amber-500/15 text-amber-400"
                                : sale.paymentMethod === "Yemek Kartı"
                                ? "bg-blue-500/15 text-blue-400"
                                : sale.paymentMethod === "Esnaf Cariye Yazıldı"
                                ? "bg-orange-500/15 text-orange-400"
                                : "bg-rose-500/15 text-rose-400"
                            }`}
                          >
                            {sale.paymentMethod}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-amber-400">{formatTL(sale.total)}</td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setInspectedSale(sale)}
                              title="Fişi İncele"
                              className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteSaleReceipt(sale.id)}
                              title="Hatalı Kaydı Sil"
                              className="p-1.5 rounded-lg bg-stone-800 hover:bg-rose-500/20 text-stone-400 hover:text-rose-400"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {analyticsSubTab === "expenses" && (
        <div className="p-5 rounded-2xl bg-[#161412] border border-stone-800 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-white">Seçili Dönem Gider & Fatura Arama</h3>
              <p className="text-xs text-stone-400">Kategoriye veya açıklamaya göre giderlerinizi filtreleyin</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <input
                type="text"
                value={reportExpenseSearch}
                onChange={(e) => setReportExpenseSearch(e.target.value)}
                placeholder="Gider başlığı veya not ara..."
                className="bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-white"
              />
              <select
                value={reportExpenseCategory}
                onChange={(e) => setReportExpenseCategory(e.target.value)}
                className="bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-white"
              >
                <option value="Tümü">Tüm Gider Kategorileri</option>
                <option>Toptancı / Malzeme</option>
                <option>Fatura / Sabit Gider</option>
                <option>Kira & Aidat</option>
                <option>Personel Gideri</option>
                <option>Bakım / Ekipman</option>
                <option>Vergi & Diğer</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-stone-800 text-stone-400 uppercase">
                  <th className="py-3 px-3">Tarih</th>
                  <th className="py-3 px-3">Gider Başlığı</th>
                  <th className="py-3 px-3">Kategori</th>
                  <th className="py-3 px-3">Ödeme Kanalı</th>
                  <th className="py-3 px-3 text-right">Tutar</th>
                  <th className="py-3 px-3 text-center">Sil</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60">
                {filteredExpenses
                  .filter(
                    (e) =>
                      (reportExpenseCategory === "Tümü" || e.category === reportExpenseCategory) &&
                      (e.title.toLowerCase().includes(reportExpenseSearch.toLowerCase()) ||
                        (e.note || "").toLowerCase().includes(reportExpenseSearch.toLowerCase()))
                  )
                  .map((exp) => (
                    <tr key={exp.id} className="hover:bg-stone-900/50">
                      <td className="py-3 px-3 text-stone-400">{formatDateShort(exp.timestamp)}</td>
                      <td className="py-3 px-3 font-medium text-white">
                        {exp.title}
                        {exp.note && <span className="block text-[11px] text-stone-500 font-normal">{exp.note}</span>}
                      </td>
                      <td className="py-3 px-3 text-stone-300">{exp.category}</td>
                      <td className="py-3 px-3 text-stone-300">{exp.paymentMethod}</td>
                      <td className="py-3 px-3 text-right font-medium text-rose-400">-{formatTL(exp.amount)}</td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => setExpenses((prev) => prev.filter((x) => x.id !== exp.id))}
                          className="p-1.5 rounded-lg hover:bg-rose-500/20 text-stone-500 hover:text-rose-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
