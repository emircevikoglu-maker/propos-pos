/* Örnek veri — yalnızca prototip. İşletme adı brandSettings.businessName'den gelir (koda yazılmaz).
   Çeşit grupları mevcut uygulamadaki hazır gruplarla aynı (src/utils/productOptions.js). */
window.PP_DATA = (function () {
  let seed = 20261124;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

  const brandSettings = { businessName: 'Liman Kahve', currency: 'TRY', dailyGoal: 12000 };
  const staff = { id: 'u1', name: 'Elif', role: 'Kasa' };
  const team = [{ name: 'Elif', role: 'Kasa', orders: 41 }, { name: 'Mert', role: 'Garson', orders: 33 }, { name: 'Zeynep', role: 'Bar', orders: 22 }];

  const optionGroups = {
    size: { id: 'size', name: 'Boy', type: 'single', required: true, def: 1, choices: [['Küçük', 0], ['Orta', 10], ['Büyük', 20]] },
    milk: { id: 'milk', name: 'Süt', type: 'single', required: false, choices: [['Normal süt', 0], ['Laktozsuz', 10], ['Yulaf sütü', 15], ['Badem sütü', 15]] },
    sugar: { id: 'sugar', name: 'Şeker', type: 'single', required: false, choices: [['Sade', 0], ['Az şekerli', 0], ['Orta', 0], ['Şekerli', 0]] },
    temp: { id: 'temp', name: 'Sıcaklık', type: 'single', required: false, choices: [['Sıcak', 0], ['Buzlu', 5]] },
    extra: { id: 'extra', name: 'Ekstra', type: 'multi', required: false, max: 3, choices: [['Ekstra shot', 15], ['Karamel şurubu', 10], ['Vanilya şurubu', 10], ['Krema', 10]] },
    tea: { id: 'tea', name: 'Servis', type: 'single', required: true, def: 0, choices: [['Bardak', 0], ['Fincan', 5], ['Demlik (2 kişilik)', 40]] }
  };

  const categories = [
    { id: 'kahve', name: 'Kahveler' }, { id: 'cay', name: 'Çaylar' }, { id: 'soguk', name: 'Soğuk' },
    { id: 'tatli', name: 'Tatlılar' }, { id: 'atis', name: 'Atıştırmalık' }
  ];

  // [id, kategori, ad, fiyat, maliyet, çeşit grupları]
  const P = [
    ['turk', 'kahve', 'Türk kahvesi', 90, 22, ['sugar']],
    ['esp', 'kahve', 'Espresso', 80, 18, ['extra']],
    ['amer', 'kahve', 'Americano', 100, 21, ['size', 'temp', 'extra']],
    ['latte', 'kahve', 'Caffè Latte', 120, 31, ['size', 'milk', 'temp', 'extra']],
    ['capp', 'kahve', 'Cappuccino', 115, 29, ['size', 'milk', 'extra']],
    ['flat', 'kahve', 'Flat White', 125, 32, ['milk', 'extra']],
    ['mocha', 'kahve', 'Mocha', 135, 38, ['size', 'milk', 'temp', 'extra']],
    ['filt', 'kahve', 'Filtre kahve', 95, 17, ['size']],
    ['cay', 'cay', 'Çay', 25, 4, ['tea']],
    ['bitki', 'cay', 'Bitki çayı', 70, 12, []],
    ['salep', 'cay', 'Salep', 110, 30, ['size']],
    ['sicak', 'cay', 'Sıcak çikolata', 120, 34, ['size', 'milk']],
    ['ilatte', 'soguk', 'Iced Latte', 130, 33, ['size', 'milk', 'extra']],
    ['cold', 'soguk', 'Cold Brew', 120, 24, ['size']],
    ['frappe', 'soguk', 'Frappe', 140, 40, ['size', 'extra']],
    ['limon', 'soguk', 'Ev yapımı limonata', 90, 18, []],
    ['soda', 'soguk', 'Maden suyu', 35, 9, []],
    ['su', 'soguk', 'Su', 20, 5, []],
    ['sanseb', 'tatli', 'San Sebastian', 180, 52, []],
    ['brown', 'tatli', 'Brownie', 140, 36, []],
    ['tira', 'tatli', 'Tiramisu', 170, 55, []],
    ['chees', 'tatli', 'Limonlu cheesecake', 165, 50, []],
    ['tost', 'atis', 'Kaşarlı tost', 130, 41, []],
    ['kruv', 'atis', 'Tereyağlı kruvasan', 95, 30, []],
    ['simit', 'atis', 'Simit', 40, 11, []],
    ['pogaca', 'atis', 'Peynirli poğaça', 45, 13, []]
  ];
  const products = P.map(([id, cat, name, price, cost, opts]) => ({ id, cat, name, price, cost, opts }));
  // bugünkü satış adetleri (menü mühendisliği için)
  const soldToday = {
    turk: 34, esp: 18, amer: 22, latte: 46, capp: 29, flat: 14, mocha: 9, filt: 21, cay: 88, bitki: 12, salep: 6, sicak: 8,
    ilatte: 19, cold: 11, frappe: 7, limon: 15, soda: 24, su: 31, sanseb: 6, brown: 17, tira: 5, chees: 9, tost: 23, kruv: 16, simit: 27, pogaca: 19
  };

  const areas = [
    { id: 'salon', name: 'Salon', tables: Array.from({ length: 12 }, (_, i) => ({ id: 'S' + (i + 1), name: 'Masa ' + (i + 1), seats: i % 3 === 0 ? 6 : 4 })) },
    { id: 'teras', name: 'Teras', tables: Array.from({ length: 8 }, (_, i) => ({ id: 'T' + (i + 1), name: 'Teras ' + (i + 1), seats: 4 })) },
    { id: 'paket', name: 'Paket', tables: Array.from({ length: 4 }, (_, i) => ({ id: 'P' + (i + 1), name: 'Paket ' + (i + 1), seats: 0 })) }
  ];

  // açık adisyonlar: dakika = kaç dakikadır açık
  const openTickets = {
    S2: { min: 18, lines: [['latte', 2, { size: 1, milk: 2 }], ['sanseb', 1]] },
    S4: { min: 47, lines: [['turk', 3, { sugar: 1 }], ['su', 3], ['brown', 1]] },
    S5: { min: 6, lines: [['cay', 4, { tea: 0 }]] },
    S9: { min: 72, lines: [['capp', 1, { size: 2 }], ['tost', 2], ['cay', 2, { tea: 0 }], ['limon', 1]] },
    T1: { min: 25, lines: [['ilatte', 2, { size: 1, milk: 0 }], ['chees', 2]] },
    T3: { min: 11, lines: [['cold', 1, { size: 1 }]] },
    P1: { min: 4, lines: [['amer', 2, { size: 2, temp: 1 }], ['kruv', 2]] }
  };

  // 15 dk dilimler 08:00–23:00 (60 dilim). Tipik = son 4 haftanın medyanı (sipariş adedi)
  const SLOT0 = 8 * 60, SLOTS = 60;
  const bell = (x, m, s) => Math.exp(-((x - m) ** 2) / (2 * s * s));
  const typical = Array.from({ length: SLOTS }, (_, i) => {
    const h = 8 + i / 4;
    return Math.round(2 + 7 * bell(h, 9.1, .8) + 9 * bell(h, 13, 1) + 11 * bell(h, 19.2, 1.3) + 3 * bell(h, 16, 1.2));
  });
  const nowMin = 14 * 60 + 20; // simülasyon saati 14:20
  const nowSlot = Math.floor((nowMin - SLOT0) / 15);
  const today = typical.map((t, i) => i < nowSlot ? Math.max(0, Math.round(t * (1.05 + (rnd() - .4) * .5))) : (i === nowSlot ? Math.round(t * .45) : null));
  // tahmin: bugünkü gidiş (×1,1) + akşam maç etkisi (geçen 4 cumanın sapması)
  const forecast = typical.map((t, i) => i <= nowSlot ? null : Math.round(t * 1.1 * (i >= 44 && i <= 50 ? 1.45 : 1)));

  const day = {
    date: new Date(2026, 10, 27), revenue: 11380, cost: 3540, orders: 96, streak: 49, bestStreak: 64,
    biggestTicket: 940, recordRevenue: 15800, lastWeekSameDay: 10120, firstSaleAt: '08:12', cash: 4210, card: 7170
  };
  // son 28 gün hedef serisi (true = hedef tuttu)
  const goalHistory = Array.from({ length: 27 }, (_, i) => rnd() > (i > 20 ? .15 : .35));

  const story = [
    { t: '08:12', icon: 'sun', text: 'Günün ilk satışı · Masa 3 · ₺215' },
    { t: '09:40', icon: 'zap', text: 'Sabah zirvesi: 15 dk\'da 14 sipariş (normalin 1,3 katı)' },
    { t: '12:55', icon: 'star', text: 'Günün en büyük adisyonu · Teras 6 · ₺940' },
    { t: '13:30', icon: 'flame', text: 'Elif 40 hatasız siparişe ulaştı' }
  ];

  return {
    brandSettings, staff, team, optionGroups, categories, products, soldToday, areas, openTickets,
    series: { SLOT0, SLOTS, typical, today, forecast, nowSlot, nowMin }, day, goalHistory, story
  };
})();
