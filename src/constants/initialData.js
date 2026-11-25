// ProPos Kurumsal POS - Başlangıç Sabitleri ve Varsayılan Veri Şablonları

export const DEALER_TENANTS_KEY = "propos_dealer_tenants_v1";
export const PROTECTED_TABS = ["analytics", "staff", "finance", "settings"];

export const DEFAULT_DEALER_TENANTS = [
  {
    tenantId: "DEFAULT",
    displayCode: "MASTER",
    businessName: "Ana İşletme",
    ownerName: "Kurucu / Ana İşletme",
    licenseKey: "PROPOS-MASTER-UNLIMITED",
    planType: "lifetime",
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
    expiresAt: "unlimited",
    themeId: "emerald",
    currency: "TRY"
  }
];

export const INITIAL_ZONES = ["Bahçe", "İç Mekan", "Teras", "Paket / Gel-Al"];
export const INITIAL_CATEGORIES = ["Kahveler", "Soğuk İçecekler", "Tatlılar", "Atıştırmalıklar", "Ekstralar"];

export const CURRENCY_OPTIONS = {
  TRY: { code: "TRY", symbol: "₺", name: "Türk Lirası (₺)", locale: "tr-TR" },
  USD: { code: "USD", symbol: "$", name: "Amerikan Doları ($)", locale: "en-US" },
  EUR: { code: "EUR", symbol: "€", name: "Euro (€)", locale: "de-DE" },
  GBP: { code: "GBP", symbol: "£", name: "İngiliz Sterlini (£)", locale: "en-GB" }
};

export const THEME_PRESETS = [
  { id: "amber", name: "Espresso & Altın (Varsayılan)", primary: "#f59e0b", secondary: "#ea580c", bg: "#080706", panel: "#161412" },
  { id: "emerald", name: "Star Zümrüt Yeşili", primary: "#10b981", secondary: "#059669", bg: "#040907", panel: "#0c1713" },
  { id: "Ocean", name: "Kurumsal Okyanus Mavisi", primary: "#3b82f6", secondary: "#2563eb", bg: "#050811", panel: "#0e1525" },
  { id: "royal", name: "Lüks Mor & Kadife", primary: "#8b5cf6", secondary: "#7c3aed", bg: "#090612", panel: "#151024" },
  { id: "crimson", name: "Vişne & Koyu Antrasit", primary: "#f43f5e", secondary: "#e11d48", bg: "#0c0507", panel: "#1c0d12" },
  { id: "minimal", name: "Monokrom Platin", primary: "#e7e5e4", secondary: "#a8a29e", bg: "#09090b", panel: "#18181b" }
];

export const INITIAL_BRAND_SETTINGS = {
  businessName: "ProPos",
  subtitle: "Kurumsal POS & Bulut ERP Sistemi",
  badgeText: "ENTERPRISE",
  logoType: "text",
  logoText: "PP",
  logoEmoji: "⚡",
  logoImageUrl: "",
  currency: "TRY",
  themeId: "amber",
  customPrimary: "#f59e0b",
  customSecondary: "#ea580c",
  customBg: "#080706",
  customPanel: "#161412"
};

export const INITIAL_STAFF = [
  { id: "st-1", name: "Emirhan", role: "Barista & Kasa", color: "#f59e0b", avatar: "E" },
  { id: "st-2", name: "Zeynep", role: "Baş Barista", color: "#10b981", avatar: "Z" },
  { id: "st-3", name: "Ahmet", role: "Servis Personeli", color: "#3b82f6", avatar: "A" },
  { id: "st-4", name: "Can", role: "Part-Time Barista", color: "#8b5cf6", avatar: "C" }
];

export const INITIAL_INGREDIENTS = [
  { id: "ing-1", name: "Espresso Çekirdeği", unit: "gr", stock: 4200, minLimit: 1000, unitCost: 0.85 },
  { id: "ing-2", name: "Günlük Taze Süt", unit: "ml", stock: 14500, minLimit: 4000, unitCost: 0.045 },
  { id: "ing-3", name: "Filtre Kahve Çekirdeği", unit: "gr", stock: 1850, minLimit: 600, unitCost: 0.75 },
  { id: "ing-4", name: "Karamel Şurubu", unit: "ml", stock: 680, minLimit: 750, unitCost: 0.35 },
  { id: "ing-5", name: "Beyaz Çikolata Sosu", unit: "ml", stock: 520, minLimit: 600, unitCost: 0.4 },
  { id: "ing-6", name: "Çikolata Sosu (Mocha)", unit: "ml", stock: 1100, minLimit: 500, unitCost: 0.38 },
  { id: "ing-7", name: "San Sebastian Dilim", unit: "adet", stock: 14, minLimit: 6, unitCost: 48 },
  { id: "ing-8", name: "Magnolia (Çilekli)", unit: "adet", stock: 9, minLimit: 5, unitCost: 38 },
  { id: "ing-9", name: "Tiramisu Porsiyon", unit: "adet", stock: 4, minLimit: 5, unitCost: 42 },
  { id: "ing-10", name: "Kruvasan (Tereyağlı)", unit: "adet", stock: 11, minLimit: 5, unitCost: 28 },
  { id: "ing-11", name: "Tost Ekmeği & Kaşar/Sucuk Set", unit: "adet", stock: 22, minLimit: 8, unitCost: 32 },
  { id: "ing-12", name: "Takeaway Karton Bardak", unit: "adet", stock: 340, minLimit: 100, unitCost: 2.2 },
  { id: "ing-13", name: "Matcha Tozu (Seremoni)", unit: "gr", stock: 240, minLimit: 100, unitCost: 3.5 },
  { id: "ing-14", name: "Hibiskus & Orman Meyvesi Özü", unit: "ml", stock: 1900, minLimit: 500, unitCost: 0.25 },
  { id: "ing-15", name: "Rize Dökme Çay Yaprağı", unit: "gr", stock: 3200, minLimit: 500, unitCost: 0.35 },
  { id: "ing-16", name: "Türk Kahvesi (Taze Çekim)", unit: "gr", stock: 1400, minLimit: 300, unitCost: 0.65 },
  { id: "ing-17", name: "Cam/Pet Su (330ml)", unit: "adet", stock: 95, minLimit: 24, unitCost: 4.5 }
];

export const INITIAL_PRODUCTS = [
  { id: "prd-17", name: "Demleme Bardak Çay", category: "Kahveler", price: 25, isQuickFav: true, image: "🍵", recipe: [{ ingredientId: "ing-15", amount: 4 }], options: [{ id: "og-tea", name: "Servis", type: "single", required: true, max: 1, choices: [{ id: "oc-bardak", name: "Bardak", price: 0 }, { id: "oc-fincan", name: "Fincan", price: 5 }, { id: "oc-demlik", name: "Demlik (2 kişilik)", price: 40 }] }] },
  { id: "prd-18", name: "Türk Kahvesi (Double/Klasik)", category: "Kahveler", price: 65, isQuickFav: true, image: "☕", recipe: [{ ingredientId: "ing-16", amount: 10 }], options: [{ id: "og-sugar", name: "Şeker", type: "single", required: true, max: 1, choices: [{ id: "oc-sade", name: "Sade", price: 0 }, { id: "oc-az", name: "Az şekerli", price: 0 }, { id: "oc-orta", name: "Orta", price: 0 }, { id: "oc-sekerli", name: "Şekerli", price: 0 }] }] },
  { id: "prd-19", name: "Doğal Kaynak Suyu", category: "Soğuk İçecekler", price: 20, isQuickFav: true, image: "💧", recipe: [{ ingredientId: "ing-17", amount: 1 }] },
  { id: "prd-1", name: "Caffè Latte", category: "Kahveler", price: 95, isQuickFav: true, image: "☕", recipe: [{ ingredientId: "ing-1", amount: 18 }, { ingredientId: "ing-2", amount: 220 }], options: [{ id: "og-size", name: "Boy", type: "single", required: true, max: 1, choices: [{ id: "oc-s", name: "Küçük", price: 0 }, { id: "oc-m", name: "Orta", price: 10 }, { id: "oc-l", name: "Büyük", price: 20 }] }, { id: "og-milk", name: "Süt", type: "single", required: false, max: 1, choices: [{ id: "oc-normal", name: "Normal süt", price: 0 }, { id: "oc-lf", name: "Laktozsuz", price: 10 }, { id: "oc-oat", name: "Yulaf sütü", price: 15 }] }, { id: "og-extra", name: "Ekstra", type: "multi", required: false, max: 2, choices: [{ id: "oc-shot", name: "Ekstra shot", price: 15 }, { id: "oc-caramel", name: "Karamel şurubu", price: 10 }] }] },
  { id: "prd-2", name: "Americano", category: "Kahveler", price: 85, isQuickFav: true, image: "🖤", recipe: [{ ingredientId: "ing-1", amount: 18 }], options: [{ id: "og-size", name: "Boy", type: "single", required: true, max: 1, choices: [{ id: "oc-s", name: "Küçük", price: 0 }, { id: "oc-m", name: "Orta", price: 10 }, { id: "oc-l", name: "Büyük", price: 20 }] }, { id: "og-extra", name: "Ekstra", type: "multi", required: false, max: 2, choices: [{ id: "oc-shot", name: "Ekstra shot", price: 15 }, { id: "oc-caramel", name: "Karamel şurubu", price: 10 }] }] },
  { id: "prd-3", name: "Flat White", category: "Kahveler", price: 105, image: "🤎", recipe: [{ ingredientId: "ing-1", amount: 36 }, { ingredientId: "ing-2", amount: 160 }] },
  { id: "prd-4", name: "Filtre Kahve", category: "Kahveler", price: 75, image: "🫖", recipe: [{ ingredientId: "ing-3", amount: 20 }] },
  { id: "prd-5", name: "Cortado", category: "Kahveler", price: 90, image: "🥃", recipe: [{ ingredientId: "ing-1", amount: 18 }, { ingredientId: "ing-2", amount: 100 }] },
  { id: "prd-6", name: "Iced Caramel Macchiato", category: "Soğuk İçecekler", price: 115, image: "🧊", recipe: [{ ingredientId: "ing-1", amount: 18 }, { ingredientId: "ing-2", amount: 200 }, { ingredientId: "ing-4", amount: 25 }, { ingredientId: "ing-12", amount: 1 }] },
  { id: "prd-7", name: "Iced White Chocolate Mocha", category: "Soğuk İçecekler", price: 120, image: "🥤", recipe: [{ ingredientId: "ing-1", amount: 18 }, { ingredientId: "ing-2", amount: 200 }, { ingredientId: "ing-5", amount: 30 }, { ingredientId: "ing-12", amount: 1 }] },
  { id: "prd-8", name: "Iced Matcha Latte", category: "Soğuk İçecekler", price: 125, image: "🍵", recipe: [{ ingredientId: "ing-13", amount: 6 }, { ingredientId: "ing-2", amount: 220 }, { ingredientId: "ing-12", amount: 1 }] },
  { id: "prd-9", name: "Cool Berry Hibiscus", category: "Soğuk İçecekler", price: 105, image: "🌺", recipe: [{ ingredientId: "ing-14", amount: 80 }, { ingredientId: "ing-12", amount: 1 }] },
  { id: "prd-10", name: "San Sebastian Cheesecake", category: "Tatlılar", price: 145, image: "🍰", recipe: [{ ingredientId: "ing-7", amount: 1 }, { ingredientId: "ing-6", amount: 25 }] },
  { id: "prd-11", name: "Çilekli Magnolia", category: "Tatlılar", price: 115, image: "🍓", recipe: [{ ingredientId: "ing-8", amount: 1 }] },
  { id: "prd-12", name: "İtalyan Tiramisu", category: "Tatlılar", price: 130, image: "🍮", recipe: [{ ingredientId: "ing-9", amount: 1 }] },
  { id: "prd-13", name: "Tereyağlı Kruvasan", category: "Atıştırmalıklar", price: 85, image: "🥐", recipe: [{ ingredientId: "ing-10", amount: 1 }] },
  { id: "prd-14", name: "Bazlama Tost", category: "Atıştırmalıklar", price: 110, isQuickFav: true, image: "🥪", recipe: [{ ingredientId: "ing-11", amount: 1 }] },
  { id: "prd-15", name: "Ekstra Espresso Shot", category: "Ekstralar", price: 30, image: "⚡", recipe: [{ ingredientId: "ing-1", amount: 18 }] },
  { id: "prd-16", name: "Ekstra Karamel / Çikolata Sos", category: "Ekstralar", price: 25, image: "🍯", recipe: [{ ingredientId: "ing-4", amount: 15 }] }
];

export const INITIAL_TABLES = [
  {
    id: "tbl-1", name: "Bahçe 1", zone: "Bahçe", status: "occupied",
    openedAt: new Date(Date.now() - 38 * 60000).toISOString(), staffId: "st-1", discount: 0, paidAmount: 0,
    items: [
      { id: "oi-101", productId: "prd-1", name: "Caffè Latte", price: 95, qty: 2, note: "Yulaf sütlü / Ekstra sıcak" },
      { id: "oi-102", productId: "prd-10", name: "San Sebastian Cheesecake", price: 145, qty: 1, note: "Bol çikolatalı" }
    ]
  },
  { id: "tbl-2", name: "Bahçe 2", zone: "Bahçe", status: "empty", openedAt: null, staffId: "st-1", discount: 0, paidAmount: 0, items: [] },
  {
    id: "tbl-3", name: "Bahçe 3", zone: "Bahçe", status: "occupied",
    openedAt: new Date(Date.now() - 19 * 60000).toISOString(), staffId: "st-2", discount: 0, paidAmount: 0,
    items: [
      { id: "oi-103", productId: "prd-6", name: "Iced Caramel Macchiato", price: 115, qty: 2, note: "" },
      { id: "oi-104", productId: "prd-14", name: "Bazlama Tost", price: 110, qty: 1, note: "" },
      { id: "oi-105", productId: "prd-11", name: "Çilekli Magnolia", price: 115, qty: 1, note: "" }
    ]
  },
  { id: "tbl-4", name: "Bahçe 4", zone: "Bahçe", status: "empty", openedAt: null, staffId: "st-2", discount: 0, paidAmount: 0, items: [] },
  { id: "tbl-5", name: "Bahçe 5", zone: "Bahçe", status: "empty", openedAt: null, staffId: "st-3", discount: 0, paidAmount: 0, items: [] },
  {
    id: "tbl-6", name: "Salon 1", zone: "İç Mekan", status: "occupied",
    openedAt: new Date(Date.now() - 55 * 60000).toISOString(), staffId: "st-3", discount: 0, paidAmount: 0,
    items: [
      { id: "oi-106", productId: "prd-4", name: "Filtre Kahve", price: 75, qty: 3, note: "" },
      { id: "oi-107", productId: "prd-13", name: "Tereyağlı Kruvasan", price: 85, qty: 2, note: "Isıtılsın" }
    ]
  },
  { id: "tbl-7", name: "Salon 2", zone: "İç Mekan", status: "empty", openedAt: null, staffId: "st-1", discount: 0, paidAmount: 0, items: [] },
  { id: "tbl-8", name: "Salon 3", zone: "İç Mekan", status: "empty", openedAt: null, staffId: "st-2", discount: 0, paidAmount: 0, items: [] },
  { id: "tbl-9", name: "Salon 4 (Loca)", zone: "İç Mekan", status: "empty", openedAt: null, staffId: "st-3", discount: 0, paidAmount: 0, items: [] },
  { id: "tbl-10", name: "Bar Masası", zone: "İç Mekan", status: "empty", openedAt: null, staffId: "st-4", discount: 0, paidAmount: 0, items: [] },
  { id: "tbl-11", name: "Teras 1", zone: "Teras", status: "empty", openedAt: null, staffId: "st-1", discount: 0, paidAmount: 0, items: [] },
  {
    id: "tbl-12", name: "Teras 2", zone: "Teras", status: "occupied",
    openedAt: new Date(Date.now() - 12 * 60000).toISOString(), staffId: "st-4", discount: 0, paidAmount: 0,
    items: [
      { id: "oi-108", productId: "prd-7", name: "Iced White Chocolate Mocha", price: 120, qty: 2, note: "" },
      { id: "oi-109", productId: "prd-12", name: "İtalyan Tiramisu", price: 130, qty: 2, note: "" }
    ]
  },
  { id: "tbl-13", name: "Teras 3", zone: "Teras", status: "empty", openedAt: null, staffId: "st-2", discount: 0, paidAmount: 0, items: [] },
  { id: "tbl-14", name: "Gel-Al (Hızlı Kasa 1)", zone: "Paket / Gel-Al", status: "empty", openedAt: null, staffId: "st-1", discount: 0, paidAmount: 0, items: [] },
  { id: "tbl-15", name: "Gel-Al (Hızlı Kasa 2)", zone: "Paket / Gel-Al", status: "empty", openedAt: null, staffId: "st-2", discount: 0, paidAmount: 0, items: [] },
  { id: "tbl-esnaf-fast", name: "⚡ Hızlı Esnaf / Tezgah", zone: "Paket / Gel-Al", status: "empty", openedAt: null, staffId: "st-1", discount: 0, paidAmount: 0, items: [] }
];

export const INITIAL_ESNAF = [
  {
    id: "esn-1", name: "Komşu Berber Salih", shopType: "Erkek Kuaförü", phone: "0532 411 22 33",
    discountRate: 15, balance: 485, note: "Çaylar ince belli bardakta, şekersiz",
    transactions: [
      {
        id: "etr-1", type: "charge", timestamp: new Date(Date.now() - 1000 * 60 * 140).toISOString(),
        staffId: "st-1", amount: 165,
        items: [{ name: "Demleme Bardak Çay", qty: 4, price: 25 }, { name: "Türk Kahvesi (Double/Klasik)", qty: 1, price: 65 }],
        note: "Çırak aldı"
      },
      {
        id: "etr-2", type: "charge", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
        staffId: "st-2", amount: 520,
        items: [{ name: "Bazlama Tost", qty: 2, price: 110 }, { name: "Americano", qty: 2, price: 85 }, { name: "Demleme Bardak Çay", qty: 5, price: 26 }],
        note: "Öğle arası"
      },
      {
        id: "etr-3", type: "payment", paymentMethod: "Nakit", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
        staffId: "st-1", amount: 200, note: "Akşamüstü kısmi ödeme"
      }
    ]
  },
  {
    id: "esn-2", name: "Oto Yıkama & Detailing Mert", shopType: "Oto Yıkama", phone: "0544 892 10 11",
    discountRate: 10, balance: 830, note: "Tostlar bol ketçaplı",
    transactions: [
      {
        id: "etr-4", type: "charge", timestamp: new Date(Date.now() - 1000 * 60 * 95).toISOString(),
        staffId: "st-3", amount: 330,
        items: [{ name: "Bazlama Tost", qty: 2, price: 110 }, { name: "Iced Caramel Macchiato", qty: 1, price: 110 }],
        note: "Mert usta"
      },
      {
        id: "etr-5", type: "charge", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
        staffId: "st-2", amount: 500,
        items: [{ name: "Demleme Bardak Çay", qty: 12, price: 25 }, { name: "Caffè Latte", qty: 2, price: 100 }],
        note: "Ekip kahvaltısı"
      }
    ]
  },
  {
    id: "esn-3", name: "Eczane Selin Hanım", shopType: "Eczane", phone: "0533 771 88 99",
    discountRate: 10, balance: 295, note: "Genelde laktozsuz sütlü Latte",
    transactions: [
      {
        id: "etr-6", type: "charge", timestamp: new Date(Date.now() - 1000 * 60 * 210).toISOString(),
        staffId: "st-2", amount: 295,
        items: [{ name: "Caffè Latte", qty: 2, price: 95 }, { name: "Çilekli Magnolia", qty: 1, price: 105 }],
        note: "Kalfa teslim aldı"
      }
    ]
  },
  {
    id: "esn-4", name: "Kırtasiye & Fotokopi Uğur", shopType: "Kırtasiye", phone: "0505 312 45 67",
    discountRate: 15, balance: 140, note: "Türk kahvesi orta şekerli",
    transactions: [
      {
        id: "etr-7", type: "charge", timestamp: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
        staffId: "st-4", amount: 140,
        items: [{ name: "Türk Kahvesi (Double/Klasik)", qty: 2, price: 55 }, { name: "Doğal Kaynak Suyu", qty: 2, price: 15 }],
        note: ""
      }
    ]
  },
  {
    id: "esn-5", name: "Tekel & Şarküteri Hasan Abi", shopType: "Market / Tekel", phone: "0535 660 19 20",
    discountRate: 20, balance: 0, note: "Her akşam hesabını kapatır",
    transactions: []
  }
];

export const QUICK_ORDER_NOTES = [
  "Az Şekerli", "Orta Şekerli", "Sade", "Yulaf Sütlü",
  "Laktozsuz", "Ekstra Sıcak", "Az Buzlu", "Paket / Takeaway"
];

export function generateInitialSales() {
  const now = new Date();
  const sales = [];
  const sampleOrders = [
    { items: [{ productId: "prd-1", name: "Caffè Latte", price: 95, qty: 2 }, { productId: "prd-10", name: "San Sebastian Cheesecake", price: 145, qty: 1 }], method: "Kredi Kartı", staffId: "st-1", tableName: "Bahçe 2" },
    { items: [{ productId: "prd-6", name: "Iced Caramel Macchiato", price: 115, qty: 2 }, { productId: "prd-13", name: "Tereyağlı Kruvasan", price: 85, qty: 2 }], method: "Kredi Kartı", staffId: "st-2", tableName: "Salon 1" },
    { items: [{ productId: "prd-4", name: "Filtre Kahve", price: 75, qty: 2 }], method: "Nakit", staffId: "st-1", tableName: "Gel-Al (Hızlı Kasa 1)" },
    { items: [{ productId: "prd-7", name: "Iced White Chocolate Mocha", price: 120, qty: 3 }, { productId: "prd-11", name: "Çilekli Magnolia", price: 115, qty: 2 }], method: "Kredi Kartı", staffId: "st-3", tableName: "Teras 1" },
    { items: [{ productId: "prd-2", name: "Americano", price: 85, qty: 2 }, { productId: "prd-14", name: "Bazlama Tost", price: 110, qty: 2 }], method: "Yemek Kartı", staffId: "st-2", tableName: "Bahçe 4" },
    { items: [{ productId: "prd-3", name: "Flat White", price: 105, qty: 1 }, { productId: "prd-12", name: "İtalyan Tiramisu", price: 130, qty: 1 }], method: "Nakit", staffId: "st-4", tableName: "Salon 3" },
    { items: [{ productId: "prd-8", name: "Iced Matcha Latte", price: 125, qty: 2 }, { productId: "prd-10", name: "San Sebastian Cheesecake", price: 145, qty: 2 }], method: "Kredi Kartı", staffId: "st-1", tableName: "Teras 3" },
    { items: [{ productId: "prd-9", name: "Cool Berry Hibiscus", price: 105, qty: 2 }, { productId: "prd-1", name: "Caffè Latte", price: 95, qty: 1 }], method: "Nakit", staffId: "st-3", tableName: "Bahçe 1" },
    { items: [{ productId: "prd-1", name: "Caffè Latte", price: 95, qty: 3 }, { productId: "prd-13", name: "Tereyağlı Kruvasan", price: 85, qty: 3 }], method: "Yemek Kartı", staffId: "st-2", tableName: "Salon 4 (Loca)" },
    { items: [{ productId: "prd-5", name: "Cortado", price: 90, qty: 2 }, { productId: "prd-15", name: "Ekstra Espresso Shot", price: 30, qty: 1 }], method: "Nakit", staffId: "st-4", tableName: "Bar Masası" }
  ];

  const todayHours = [9, 10, 10, 11, 12, 13, 14, 15, 16, 17, 18, 18];
  todayHours.forEach((hr, idx) => {
    const template = sampleOrders[idx % sampleOrders.length];
    const d = new Date(now);
    d.setHours(hr, (idx * 13) % 55, 0, 0);
    const total = template.items.reduce((s, i) => s + i.price * i.qty, 0);
    sales.push({
      id: `sl-today-${idx + 1}`,
      timestamp: d.toISOString(),
      tableName: template.tableName,
      staffId: template.staffId,
      paymentMethod: template.method,
      subtotal: total,
      discount: 0,
      total,
      items: template.items
    });
  });

  for (let dayOffset = 1; dayOffset <= 6; dayOffset++) {
    for (let j = 0; j < 7; j++) {
      const template = sampleOrders[(dayOffset + j) % sampleOrders.length];
      const d = new Date(now);
      d.setDate(now.getDate() - dayOffset);
      d.setHours(10 + j, 20, 0, 0);
      const total = template.items.reduce((s, i) => s + i.price * i.qty, 0);
      sales.push({
        id: `sl-week-${dayOffset}-${j}`,
        timestamp: d.toISOString(),
        tableName: template.tableName,
        staffId: INITIAL_STAFF[(dayOffset + j) % INITIAL_STAFF.length].id,
        paymentMethod: template.method,
        subtotal: total,
        discount: 0,
        total,
        items: template.items
      });
    }
  }

  for (let dayOffset = 7; dayOffset <= 25; dayOffset += 2) {
    for (let j = 0; j < 6; j++) {
      const template = sampleOrders[(dayOffset + j) % sampleOrders.length];
      const d = new Date(now);
      d.setDate(now.getDate() - dayOffset);
      d.setHours(11 + j, 15, 0, 0);
      const total = template.items.reduce((s, i) => s + i.price * i.qty, 0);
      sales.push({
        id: `sl-month-${dayOffset}-${j}`,
        timestamp: d.toISOString(),
        tableName: template.tableName,
        staffId: INITIAL_STAFF[(dayOffset + j) % INITIAL_STAFF.length].id,
        paymentMethod: template.method,
        subtotal: total,
        discount: 0,
        total,
        items: template.items
      });
    }
  }

  return sales.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

export function generateInitialExpenses() {
  const now = new Date();
  const makeDate = (daysAgo, hr = 12) => {
    const d = new Date(now);
    d.setDate(now.getDate() - daysAgo);
    d.setHours(hr, 30, 0, 0);
    return d.toISOString();
  };

  return [
    { id: "exp-1", title: "Günlük Taze Süt & Buz Tedariği", category: "Toptancı / Malzeme", amount: 850, paymentMethod: "Nakit", timestamp: makeDate(0, 9), note: "Sabah sevkiyatı (20L Süt + Buz)" },
    { id: "exp-2", title: "Personel Öğle Yemeği", category: "Personel Gideri", amount: 480, paymentMethod: "Yemek Kartı", timestamp: makeDate(0, 13), note: "4 Kişilik Menü" },
    { id: "exp-3", title: "San Sebastian & Tatlı Toptancısı", category: "Toptancı / Malzeme", amount: 3400, paymentMethod: "Kredi Kartı", timestamp: makeDate(2), note: "Haftalık taze tatlı alımı" },
    { id: "exp-4", title: "Kolombiya Espresso Çekirdek (10 Kg)", category: "Toptancı / Malzeme", amount: 6800, paymentMethod: "Kredi Kartı", timestamp: makeDate(4), note: "Kavurmacı Faturası" },
    { id: "exp-5", title: "Elektrik & Su Faturası", category: "Fatura / Sabit Gider", amount: 5250, paymentMethod: "Kredi Kartı", timestamp: makeDate(10), note: "Aylık işletme elektrik" },
    { id: "exp-6", title: "Karton Bardak & Peçete Ambalaj", category: "Toptancı / Malzeme", amount: 2400, paymentMethod: "Kredi Kartı", timestamp: makeDate(15), note: "1000 adet logolu bardak" },
    { id: "exp-7", title: "Kafe Dükkan Kirası (Kısmi/Stopaj)", category: "Kira & Aidat", amount: 18500, paymentMethod: "Banka / Havale", timestamp: makeDate(20), note: "Aylık sabit gider" }
  ];
}
