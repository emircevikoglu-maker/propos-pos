// ProPos Excel (.xls) Rapor Oluşturucu Modülü

export function exportExcelByCategory({
  reportType = "overview",
  brandSettings,
  globalPeriod,
  customStartDate,
  customEndDate,
  filteredSales,
  filteredExpenses,
  kpiMetrics,
  topProducts,
  staffList,
  staffPerformance,
  esnafList,
  totalEsnafReceivable,
  showToast
}) {
  const esc = (str) =>
    String(str != null ? str : "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const getDateKey = (iso) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const getDateLabel = (dateKey) => {
    const [y, m, d] = dateKey.split("-");
    const dt = new Date(Number(y), Number(m) - 1, Number(d));
    return dt.toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      weekday: "long"
    });
  };

  const periodTitleMap = {
    daily: "Bugün (Günlük)",
    yesterday: "Dün",
    weekly: "Son 7 Gün (Haftalık)",
    monthly: "Son 30 Gün (Aylık)",
    all: "Tüm Zamanlar",
    custom: `${customStartDate} / ${customEndDate}`
  };

  const reportMeta = {
    overview: { title: "GENEL GÜNLÜK BİLANÇO ÖZETİ", filePrefix: "Genel_Bilanco_Ozeti", sheetName: "Genel Bilanco" },
    products: { title: "ÜRÜN SATIŞ ADETLERİ VE KÂRLILIK RAPORU", filePrefix: "Urun_Satis_Raporu", sheetName: "Urun Satislari" },
    receipts: { title: "TARİH SIRALI ADİSYON VE SATIŞ DÖKÜMÜ", filePrefix: "Adisyon_Satis_Gecmisi", sheetName: "Adisyonlar" },
    expenses: { title: "TARİH SIRALI İŞLETME GİDERLERİ VE FATURALAR", filePrefix: "Gider_ve_Faturalar", sheetName: "Giderler" },
    staff: { title: "ÇALIŞAN PERFORMANSI VE ÖDEME YÖNTEMLERİ", filePrefix: "Calisan_Performans_Kasa", sheetName: "Calisan Kasa" },
    esnaf: { title: "ÇEVRE ESNAF CARİ BAKİYE VE HESAP HAREKETLERİ", filePrefix: "Esnaf_Cari_Bakiye", sheetName: "Esnaf Cari" }
  }[reportType] || { title: "GENEL ÖZET RAPORU", filePrefix: "Genel_Rapor", sheetName: "Rapor" };

  let tableBodyHtml = "";

  if (reportType === "overview") {
    const groupedByDate = {};
    filteredSales.forEach((s) => {
      const k = getDateKey(s.timestamp);
      if (!groupedByDate[k]) groupedByDate[k] = { sales: [], expenses: [] };
      groupedByDate[k].sales.push(s);
    });
    filteredExpenses.forEach((e) => {
      const k = getDateKey(e.timestamp);
      if (!groupedByDate[k]) groupedByDate[k] = { sales: [], expenses: [] };
      groupedByDate[k].expenses.push(e);
    });
    const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

    tableBodyHtml = `
      <table>
        <tr class="tbl-hdr">
          <th>Tarih</th>
          <th>Adisyon Sayısı</th>
          <th>Nakit Satış (TL)</th>
          <th>Kredi Kartı (TL)</th>
          <th>Yemek Kartı (TL)</th>
          <th>Brüt Kasa Cirosu (TL)</th>
          <th>Günlük Gider (TL)</th>
          <th>Net Kâr (TL)</th>
          <th>Cariye Yazılan (TL)</th>
        </tr>
    `;
    sortedDates.forEach((dk) => {
      const grp = groupedByDate[dk];
      const cash = grp.sales.filter((s) => s.paymentMethod === "Nakit").reduce((a, b) => a + b.total, 0);
      const card = grp.sales.filter((s) => s.paymentMethod === "Kredi Kartı").reduce((a, b) => a + b.total, 0);
      const meal = grp.sales.filter((s) => s.paymentMethod === "Yemek Kartı").reduce((a, b) => a + b.total, 0);
      const cari = grp.sales.filter((s) => s.paymentMethod === "Esnaf Cariye Yazıldı").reduce((a, b) => a + b.total, 0);
      const gross = cash + card + meal;
      const exp = grp.expenses.reduce((a, b) => a + b.amount, 0);
      const net = gross - exp;
      tableBodyHtml += `
        <tr>
          <td><b>${esc(getDateLabel(dk))}</b></td>
          <td class="center">${grp.sales.length}</td>
          <td class="right">${cash}</td>
          <td class="right">${card}</td>
          <td class="right">${meal}</td>
          <td class="right pos">${gross}</td>
          <td class="right neg">-${exp}</td>
          <td class="right ${net >= 0 ? "pos" : "neg"}">${net}</td>
          <td class="right cari">${cari}</td>
        </tr>
      `;
    });
    tableBodyHtml += `
        <tr class="subtotal">
          <td>TOPLAM (${sortedDates.length} Gün)</td>
          <td class="center">${kpiMetrics.orderCount}</td>
          <td class="right">${kpiMetrics.byMethod["Nakit"] || 0}</td>
          <td class="right">${kpiMetrics.byMethod["Kredi Kartı"] || 0}</td>
          <td class="right">${kpiMetrics.byMethod["Yemek Kartı"] || 0}</td>
          <td class="right pos">${kpiMetrics.grossRevenue}</td>
          <td class="right neg">-${kpiMetrics.totalExpenses}</td>
          <td class="right ${kpiMetrics.netProfit >= 0 ? "pos" : "neg"}">${kpiMetrics.netProfit}</td>
          <td class="right cari">${kpiMetrics.cariWrittenTotal}</td>
        </tr>
      </table>
    `;
  }

  if (reportType === "products") {
    tableBodyHtml = `
      <table>
        <tr class="tbl-hdr">
          <th>Sıra</th>
          <th>Ürün Adı</th>
          <th>Kategori</th>
          <th>Birim Satış Fiyatı (TL)</th>
          <th>Birim Reçete Maliyeti (TL)</th>
          <th>Satılan Adet</th>
          <th>Toplam Ciro (TL)</th>
          <th>Toplam Maliyet (TL)</th>
          <th>Bıraktığı Net Kâr (TL)</th>
          <th>Ciro Payı (%)</th>
        </tr>
    `;
    topProducts.forEach((p, idx) => {
      tableBodyHtml += `
        <tr>
          <td class="center">${idx + 1}</td>
          <td><b>${esc(p.name)}</b></td>
          <td>${esc(p.category)}</td>
          <td class="right">${p.unitPrice}</td>
          <td class="right">${p.unitCost}</td>
          <td class="center"><b>${p.qty}</b></td>
          <td class="right pos">${p.revenue}</td>
          <td class="right neg">-${Math.round(p.costTotal)}</td>
          <td class="right pos">${Math.round(p.profit)}</td>
          <td class="center">%${p.share}</td>
        </tr>
      `;
    });
    const totQty = topProducts.reduce((a, b) => a + b.qty, 0);
    const totRev = topProducts.reduce((a, b) => a + b.revenue, 0);
    const totCost = Math.round(topProducts.reduce((a, b) => a + b.costTotal, 0));
    const totProf = Math.round(topProducts.reduce((a, b) => a + b.profit, 0));
    tableBodyHtml += `
        <tr class="subtotal">
          <td colspan="5">GENEL TOPLAM</td>
          <td class="center">${totQty} Adet</td>
          <td class="right pos">${totRev} TL</td>
          <td class="right neg">-${totCost} TL</td>
          <td class="right pos">${totProf} TL</td>
          <td class="center">%100</td>
        </tr>
      </table>
    `;
  }

  if (reportType === "receipts") {
    const salesByStaff = {};
    staffList.forEach((st) => {
      salesByStaff[st.id] = { staffName: st.name, staffRole: st.role, sales: [] };
    });
    filteredSales.forEach((s) => {
      const stId = s.staffId && salesByStaff[s.staffId] ? s.staffId : "other";
      if (!salesByStaff[stId]) {
        salesByStaff[stId] = { staffName: "Diğer / Genel Kasa", staffRole: "Kasa", sales: [] };
      }
      salesByStaff[stId].sales.push(s);
    });
    const activeStaffGroups = Object.values(salesByStaff).filter((g) => g.sales.length > 0);
    if (activeStaffGroups.length === 0) {
      tableBodyHtml = `<table><tr><td colspan="8" class="center">Seçili dönemde adisyon kaydı bulunamadı.</td></tr></table>`;
    } else {
      activeStaffGroups.forEach((grp) => {
        const stCash = grp.sales.filter((s) => s.paymentMethod === "Nakit").reduce((a, b) => a + b.total, 0);
        const stCard = grp.sales.filter((s) => s.paymentMethod === "Kredi Kartı").reduce((a, b) => a + b.total, 0);
        const stMeal = grp.sales.filter((s) => s.paymentMethod === "Yemek Kartı").reduce((a, b) => a + b.total, 0);
        const stCari = grp.sales.filter((s) => s.paymentMethod === "Esnaf Cariye Yazıldı").reduce((a, b) => a + b.total, 0);
        const stNetTotal = stCash + stCard + stMeal;
        const byDate = {};
        grp.sales.forEach((s) => {
          const dk = getDateKey(s.timestamp);
          if (!byDate[dk]) byDate[dk] = [];
          byDate[dk].push(s);
        });
        const sortedDates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));
        tableBodyHtml += `
          <table>
            <tr>
              <td colspan="8" class="staff-hdr">
                👤 PERSONEL: ${esc(grp.staffName.toUpperCase())} (${esc(grp.staffRole)}) — Toplam ${grp.sales.length} Adisyon | Net Kasa: ${stNetTotal} TL (Nakit: ${stCash} TL • Kart: ${stCard} TL • Yemek Kartı: ${stMeal} TL • Cari: ${stCari} TL)
              </td>
            </tr>
            <tr class="tbl-hdr">
              <th>Personel</th>
              <th>Tarih</th>
              <th>Saat</th>
              <th>Masa / İşlem</th>
              <th>Sipariş İçeriği</th>
              <th>Ödeme Yöntemi</th>
              <th>İndirim (TL)</th>
              <th>Net Tutar (TL)</th>
            </tr>
        `;
        sortedDates.forEach((dk) => {
          const dayList = byDate[dk];
          const daySum = dayList.filter((s) => s.paymentMethod !== "İkram / İptal").reduce((a, b) => a + b.total, 0);
          tableBodyHtml += `
            <tr>
              <td colspan="8" class="date-hdr">
                📅 ${esc(grp.staffName)} — ${esc(getDateLabel(dk))} (${dayList.length} Adisyon | Günlük Toplam: ${daySum} TL)
              </td>
            </tr>
          `;
          dayList.forEach((s) => {
            const dateStr = new Date(s.timestamp).toLocaleDateString("tr-TR");
            const timeStr = new Date(s.timestamp).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
            const itemsStr = s.items.map((i) => `${i.qty}x ${i.name}`).join(", ");
            tableBodyHtml += `
              <tr>
                <td><b>${esc(grp.staffName)}</b></td>
                <td class="center">${esc(dateStr)}</td>
                <td class="center">${esc(timeStr)}</td>
                <td><b>${esc(s.tableName)}</b></td>
                <td>${esc(itemsStr)}</td>
                <td class="center">${esc(s.paymentMethod)}</td>
                <td class="right">${s.discount || 0}</td>
                <td class="right pos">${s.total}</td>
              </tr>
            `;
          });
        });
        tableBodyHtml += `
            <tr class="subtotal">
              <td colspan="5">${esc(grp.staffName.toUpperCase())} GENEL TOPLAMI (${grp.sales.length} Adisyon)</td>
              <td colspan="2" class="right">Nakit: ${stCash} TL | Kart: ${stCard} TL | Yemek: ${stMeal} TL | Cari: ${stCari} TL</td>
              <td class="right pos">${stNetTotal + stCari} TL</td>
            </tr>
          </table>
          <br/><br/>
        `;
      });
    }
  }

  if (reportType === "expenses") {
    const expByDate = {};
    filteredExpenses.forEach((e) => {
      const k = getDateKey(e.timestamp);
      if (!expByDate[k]) expByDate[k] = [];
      expByDate[k].push(e);
    });
    const sortedDates = Object.keys(expByDate).sort((a, b) => b.localeCompare(a));
    tableBodyHtml = `
      <table>
        <tr class="tbl-hdr">
          <th>Tarih</th>
          <th>Saat</th>
          <th>Gider Başlığı</th>
          <th>Kategori</th>
          <th>Ödeme Kanalı</th>
          <th>Açıklama / Not</th>
          <th>Tutar (TL)</th>
        </tr>
    `;
    sortedDates.forEach((dk) => {
      const dayExps = expByDate[dk];
      const dayTotal = dayExps.reduce((a, b) => a + b.amount, 0);
      tableBodyHtml += `
        <tr>
          <td colspan="7" class="date-hdr">📅 ${esc(getDateLabel(dk))} — (Günlük Gider Toplamı: -${dayTotal} TL)</td>
        </tr>
      `;
      dayExps.forEach((ex) => {
        const dateStr = new Date(ex.timestamp).toLocaleDateString("tr-TR");
        const timeStr = new Date(ex.timestamp).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
        tableBodyHtml += `
          <tr>
            <td class="center">${esc(dateStr)}</td>
            <td class="center">${esc(timeStr)}</td>
            <td><b>${esc(ex.title)}</b></td>
            <td>${esc(ex.category)}</td>
            <td class="center">${esc(ex.paymentMethod)}</td>
            <td>${esc(ex.note || "-")}</td>
            <td class="right neg">-${ex.amount}</td>
          </tr>
        `;
      });
    });
    tableBodyHtml += `
        <tr class="subtotal">
          <td colspan="6">TOPLAM GİDERLER</td>
          <td class="right neg">-${kpiMetrics.totalExpenses} TL</td>
        </tr>
      </table>
    `;
  }

  if (reportType === "staff") {
    tableBodyHtml = `
      <table>
        <tr class="tbl-hdr">
          <th>Çalışan Adı</th>
          <th>Görevi</th>
          <th>Kapatılan Adisyon</th>
          <th>Satılan Ürün Adedi</th>
          <th>Nakit Satış (TL)</th>
          <th>Kredi Kartı (TL)</th>
          <th>Yemek Kartı (TL)</th>
          <th>Esnaf Cariye Yazılan (TL)</th>
          <th>Net Kasa Toplamı (TL)</th>
        </tr>
    `;
    staffPerformance.forEach((st) => {
      tableBodyHtml += `
        <tr>
          <td><b>${esc(st.name)}</b></td>
          <td>${esc(st.role)}</td>
          <td class="center">${st.orderCount}</td>
          <td class="center">${st.itemCount}</td>
          <td class="right">${st.cash}</td>
          <td class="right">${st.card}</td>
          <td class="right">${st.mealCard}</td>
          <td class="right cari">${st.cariWritten}</td>
          <td class="right pos">${st.total}</td>
        </tr>
      `;
    });
    tableBodyHtml += `</table>`;
  }

  if (reportType === "esnaf") {
    tableBodyHtml = `
      <table>
        <tr class="tbl-hdr">
          <th>Esnaf / İşletme Adı</th>
          <th>Sektör / Dükkan</th>
          <th>Telefon</th>
          <th>Tanımlı İndirim (%)</th>
          <th>Özel Not</th>
          <th>Güncel Açık Bakiye (TL)</th>
        </tr>
    `;
    esnafList.forEach((esn) => {
      tableBodyHtml += `
        <tr>
          <td><b>${esc(esn.name)}</b></td>
          <td>${esc(esn.shopType)}</td>
          <td>${esc(esn.phone)}</td>
          <td class="center">%${esn.discountRate}</td>
          <td>${esc(esn.note || "-")}</td>
          <td class="right ${esn.balance > 0 ? "cari" : "pos"}">${esn.balance}</td>
        </tr>
      `;
    });
    tableBodyHtml += `
        <tr class="subtotal">
          <td colspan="5">TOPLAM ESNAF CARİ ALACAK</td>
          <td class="right cari">${totalEsnafReceivable} TL</td>
        </tr>
      </table>
    `;
  }

  const fullHtml = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="UTF-8">
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>${esc(reportMeta.sheetName)}</x:Name>
              <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <style>
        body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #1c1917; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #d6d3d1; padding: 8px 12px; vertical-align: middle; }
        .title { background-color: #f59e0b; color: #0c0a09; font-size: 14pt; font-weight: bold; }
        .meta { background-color: #f5f5f4; font-size: 10pt; color: #44403c; }
        .staff-hdr { background-color: #1c1917; color: #fbbf24; font-size: 12pt; font-weight: bold; padding: 10px 12px; }
        .date-hdr { background-color: #fef3c7; color: #92400e; font-size: 11pt; font-weight: bold; }
        .tbl-hdr { background-color: #292524; color: #ffffff; font-weight: bold; text-align: center; }
        .subtotal { background-color: #e7e5e4; font-weight: bold; font-size: 11pt; }
        .right { text-align: right; }
        .center { text-align: center; }
        .pos { color: #047857; font-weight: bold; }
        .neg { color: #be123c; font-weight: bold; }
        .cari { color: #c2410c; font-weight: bold; }
      </style>
    </head>
    <body>
      <table>
        <tr><td colspan="8" class="title">☕ ${esc(brandSettings.businessName)} — ${esc(reportMeta.title)}</td></tr>
        <tr class="meta">
          <td colspan="4"><b>Seçili Dönem:</b> ${esc(periodTitleMap[globalPeriod] || "Seçili Dönem")}</td>
          <td colspan="4"><b>İndirilme Zamanı:</b> ${esc(new Date().toLocaleString("tr-TR"))}</td>
        </tr>
      </table>
      <br/>
      ${tableBodyHtml}
    </body>
    </html>
  `;

  const blob = new Blob(["\uFEFF", fullHtml], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const safeBrandSlug = (brandSettings.businessName || "Isletme").replace(/[^a-zA-Z0-9]/g, "_");
  a.download = `${safeBrandSlug}_${reportMeta.filePrefix}_${new Date().toISOString().slice(0, 10)}.xls`;
  a.click();
  URL.revokeObjectURL(url);
  if (showToast) {
    showToast(`📊 "${reportMeta.title}" ayrı bir Excel (.xls) dosyası olarak indirildi!`);
  }
}
