// ProPos Müşteri Kurulum Paketi (.ZIP / .HTML / .HTA) & Teslimat Araçları
import { DEFAULT_DEALER_TENANTS } from "../constants/initialData";
import { getLocalSyncBaseUrl } from "../services/apiService";
import { getProPosStorageKey } from "./formatters";

export function copyCustomerDeliveryMessage(tObj, showToast) {
  const code = tObj.displayCode || tObj.tenantId;
  const expText = tObj.expiresAt === "unlimited" ? "Süresiz (Ömür Boyu)" : new Date(tObj.expiresAt).toLocaleDateString("tr-TR");
  const msg = [
    `🚀 *${tObj.businessName} — ProPos Kurumsal POS & Mobil ERP Teslimat Bilgileri*`,
    ``,
    `🏢 *İşletme Kodu:* ${code}`,
    `🔑 *Lisans Anahtarı:* ${tObj.licenseKey}`,
    `🔐 *Yönetici PIN Şifresi:* ${tObj.adminPin || "1234"}`,
    `📅 *Lisans Geçerlilik:* ${expText}`,
    ``,
    `💻 *Bilgisayar Kurulumu:* Size iletilen Kurulum Paketini (.ZIP veya Tek Tık Masaüstü Programını) açıp masaüstü kısayolundan hemen kullanmaya başlayabilirsiniz.`,
    `📱 *Telefon & Tablet Senkronizasyonu:* Uygulama içindeki "PC & Mobil Canlı Senkron" butonundan QR kodu telefonunuzla okutarak veya İşletme Kodunuz (${code}) ile giriş yaparak kasa ve telefonlarınızı anlık senkronize kullanabilirsiniz.`
  ].join("\n");
  if (navigator.clipboard) navigator.clipboard.writeText(msg);
  if (showToast) {
    showToast(`📋 ${tObj.businessName} teslimat mesajı panoya kopyalandı! WhatsApp'tan gönderebilirsiniz.`);
  }
}

export function buildFullCustomerStandaloneDocument({
  targetTenantId,
  isWindowsHta = false,
  dealerTenants,
  currentTenantRecord,
  activeTenantId,
  appVersion,
  githubRepo
}) {
  const normId = !targetTenantId || targetTenantId === "PICKYS-MASTER" ? "DEFAULT" : targetTenantId;
  const tRec = dealerTenants.find((t) => t.tenantId === normId) || currentTenantRecord || DEFAULT_DEALER_TENANTS[0];
  const storageKey = getProPosStorageKey(normId);
  const rawTenantDb = localStorage.getItem(storageKey) || localStorage.getItem(getProPosStorageKey(activeTenantId)) || "{}";
  const regJson = JSON.stringify(normId === "DEFAULT" ? dealerTenants : [tRec]);

  let fullDoc = "<!DOCTYPE html>\n" + document.documentElement.outerHTML;
  const htaTag = isWindowsHta
    ? `<hta:application id="ProPos_${normId}" applicationname="${tRec.businessName} POS" border="thin" borderstyle="normal" caption="yes" maximizebutton="yes" minimizebutton="yes" sysmenu="yes" windowstate="maximize" scroll="no" singleinstance="yes" />\n`
    : "";

  const injectScript = `${htaTag}<script>
window.__PROPOS_LOCKED_TENANT__ = ${JSON.stringify(normId)};
window.__PROPOS_APP_VERSION__ = ${JSON.stringify(appVersion)};
window.__PROPOS_GITHUB_REPO__ = ${JSON.stringify(githubRepo)};
window.__PROPOS_TENANT_SEED__ = ${rawTenantDb};
try {
  localStorage.setItem("propos_active_tenant_id", ${JSON.stringify(normId)});
  localStorage.setItem("propos_app_version", ${JSON.stringify(appVersion)});
  if (${JSON.stringify(githubRepo)}) localStorage.setItem("propos_github_repo", ${JSON.stringify(githubRepo)});
  localStorage.setItem(${JSON.stringify(storageKey)}, JSON.stringify(window.__PROPOS_TENANT_SEED__));
  localStorage.setItem("propos_dealer_tenants_v1", ${JSON.stringify(regJson)});
} catch(e) {}
<\/script>\n</head>`;

  fullDoc = fullDoc.replace("</head>", injectScript);
  return { fullDoc, tRec };
}

export function downloadCustomerZipPackage({ targetTenantId, dealerTenants, brandSettings, githubRepo, appVersion, showToast }) {
  const normId = !targetTenantId || targetTenantId === "PICKYS-MASTER" ? "DEFAULT" : targetTenantId;
  const tRec = dealerTenants.find((t) => t.tenantId === normId) || {
    tenantId: normId,
    businessName: brandSettings.businessName || "ProPos"
  };
  const pkgUrl = `${getLocalSyncBaseUrl()}/api/package?tenantId=${encodeURIComponent(normId)}&businessName=${encodeURIComponent(tRec.businessName || normId)}&githubRepo=${encodeURIComponent(githubRepo || "")}&appVersion=${encodeURIComponent(appVersion || "2.4.0")}`;
  const a = document.createElement("a");
  a.href = pkgUrl;
  a.download = `ProPos_Kurulum_Paketi_${(tRec.businessName || normId).replace(/[^a-zA-Z0-9]/g, "_")}_${normId}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  if (showToast) {
    showToast(`📦 "${tRec.businessName}" için tam kurulum paketi (.ZIP: PC + Mobil Sunucu + Kısayol) indiriliyor!`);
  }
}

export function downloadOneClickWindowsInstaller(opts) {
  const { fullDoc, tRec } = buildFullCustomerStandaloneDocument({ ...opts, isWindowsHta: true });
  const safeSlug = (tRec.businessName || "ProPos").replace(/[^a-zA-Z0-9]/g, "_") || "ProPos";
  const blob = new Blob(["\uFEFF", fullDoc], { type: "application/hta;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safeSlug}_Masaustu_Programi.hta`;
  a.click();
  URL.revokeObjectURL(url);
  if (opts.showToast) {
    opts.showToast(`💻 "${tRec.businessName}" için tam bağımsız Windows Masaüstü Programı (.HTA) indirildi!`);
  }
}

export function downloadStandaloneAppHtml(opts) {
  const { fullDoc, tRec } = buildFullCustomerStandaloneDocument({ ...opts, isWindowsHta: false });
  const safeSlug = (tRec.businessName || "ProPos").replace(/[^a-zA-Z0-9]/g, "_") || "ProPos";
  const blob = new Blob(["\uFEFF", fullDoc], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safeSlug}_Mobil_ve_PC_Uygulama.html`;
  a.click();
  URL.revokeObjectURL(url);
  if (opts.showToast) {
    opts.showToast(`🚀 "${tRec.businessName}" için Tek Dosya Hazır Uygulama (.HTML) indirildi!`);
  }
}
