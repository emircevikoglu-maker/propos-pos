// Yazdırma ayarının cihaza özel kısmı (senkronlanmaz): hangi cihaz basıyor, hangi kağıt takılı.
// İşletme geneli kısım (istasyon eşlemesi, alt bilgi) brandSettings.printing içinde senkronlanır.
export const DEFAULT_DEVICE_PRINT = { width: 80, autoKitchen: false, receiptAfterPay: false };
const KEY = (tid) => `propos_print_v1_${tid || "DEFAULT"}`;

export function loadDevicePrint(tenantId) {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY(tenantId)) || "{}");
    return {
      width: raw.width === 58 ? 58 : 80,
      autoKitchen: raw.autoKitchen === true,
      receiptAfterPay: raw.receiptAfterPay === true
    };
  } catch (e) {
    return { ...DEFAULT_DEVICE_PRINT };
  }
}

export function saveDevicePrint(tenantId, value) {
  try { localStorage.setItem(KEY(tenantId), JSON.stringify(value)); } catch (e) { /* özel pencere */ }
}
