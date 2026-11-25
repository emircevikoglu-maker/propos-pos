import React from "react";
import { PosProvider, usePos } from "./context/PosContext";
import { hexToRgbTuple } from "./utils/formatters";
import { CircleCheck } from "./components/Icons";
import { Sidebar } from "./components/layout/Sidebar";
import { Header } from "./components/layout/Header";
import { PosView } from "./components/views/PosView";
import { EsnafView } from "./components/views/EsnafView";
import { InventoryView } from "./components/views/InventoryView";
import { AnalyticsView } from "./components/views/AnalyticsView";
import { StaffView } from "./components/views/StaffView";
import { FinanceView } from "./components/views/FinanceView";
import { SettingsView } from "./components/views/SettingsView";
import { DealerStudioModal } from "./components/modals/DealerStudioModal";
import { PosModals } from "./components/modals/PosModals";

function PosShell() {
  const { brandSettings, toast, activeTab } = usePos();
  const primaryRgb = hexToRgbTuple(brandSettings.customPrimary);
  const secondaryRgb = hexToRgbTuple(brandSettings.customSecondary);

  return (
    <div
      style={{ backgroundColor: brandSettings.customBg || "#080706" }}
      className="min-h-[100dvh] lg:h-screen w-full text-stone-100 flex flex-col lg:flex-row font-sans selection:bg-amber-500 selection:text-stone-950 relative overflow-x-hidden lg:overflow-hidden"
    >
      <style>{`
        :root {
          --brand-primary: ${brandSettings.customPrimary || "#f59e0b"};
          --brand-secondary: ${brandSettings.customSecondary || "#ea580c"};
          --brand-rgb: ${primaryRgb};
          --brand-sec-rgb: ${secondaryRgb};
          --brand-bg: ${brandSettings.customBg || "#080706"};
          --brand-panel: ${brandSettings.customPanel || "#161412"};
        }
        .bg-amber-500, .bg-amber-400 { background-color: var(--brand-primary) !important; }
        .hover\\:bg-amber-500:hover, .hover\\:bg-amber-400:hover { background-color: var(--brand-primary) !important; }
        .text-amber-400, .text-amber-300, .text-amber-500 { color: var(--brand-primary) !important; }
        .border-amber-500, .border-amber-400 { border-color: var(--brand-primary) !important; }
        .border-amber-500\\/40, .border-amber-500\\/30, .border-amber-400\\/40, .border-amber-400\\/30, .border-amber-500\\/45 {
          border-color: rgba(var(--brand-rgb), 0.4) !important;
        }
        .bg-amber-500\\/10, .bg-amber-500\\/15, .bg-amber-500\\/20 {
          background-color: rgba(var(--brand-rgb), 0.16) !important;
        }
        .bg-amber-950\\/25, .bg-amber-950\\/20, .bg-amber-950\\/30 {
          background-color: rgba(var(--brand-rgb), 0.14) !important;
        }
        .ring-amber-400, .ring-amber-500\\/50 {
          --tw-ring-color: var(--brand-primary) !important;
        }
        .from-amber-400, .from-amber-500 {
          --tw-gradient-from: var(--brand-primary) var(--tw-gradient-from-position) !important;
        }
        .via-amber-500 {
          --tw-gradient-via: var(--brand-primary) var(--tw-gradient-via-position) !important;
        }
        .to-orange-500, .to-orange-600, .to-amber-500 {
          --tw-gradient-to: var(--brand-secondary) var(--tw-gradient-to-position) !important;
        }
        .bg-\\[\\#161412\\], .bg-\\[\\#181512\\] {
          background-color: var(--brand-panel) !important;
        }
        @keyframes fadeSlideUp {
          0% { opacity: 0; transform: translateY(10px) scale(0.995); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-view {
          animation: fadeSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .pos-card-hover {
          transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @media (hover: hover) {
          .pos-card-hover:hover {
            transform: translateY(-2px);
            box-shadow: 0 14px 28px -12px rgba(var(--brand-rgb), 0.22), 0 4px 12px -2px rgba(0, 0, 0, 0.6);
          }
        }
        .glass-panel {
          background: linear-gradient(145deg, var(--brand-panel) 0%, rgba(12, 10, 9, 0.95) 100%);
          backdrop-filter: blur(16px);
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: rgba(12, 10, 9, 0.3); }
        ::-webkit-scrollbar-thumb { background: rgba(87, 83, 78, 0.45); border-radius: 9999px; }
        ::-webkit-scrollbar-thumb:hover { background: var(--brand-primary); }
      `}</style>

      {/* Ambient Glow Arka Plan */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div
          className="absolute -top-40 -left-40 w-80 sm:w-96 h-80 sm:h-96 rounded-full blur-[130px]"
          style={{ backgroundColor: `rgba(${primaryRgb}, 0.11)` }}
        />
        <div
          className="absolute top-1/3 right-0 w-80 sm:w-96 h-80 sm:h-96 rounded-full blur-[140px]"
          style={{ backgroundColor: `rgba(${secondaryRgb}, 0.08)` }}
        />
        <div className="absolute -bottom-32 left-1/3 w-72 h-72 rounded-full bg-emerald-500/5 blur-[120px]" />
      </div>

      {/* Bildirim Toast */}
      {toast && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-5 sm:max-w-md z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border border-amber-400/50 bg-stone-950/95 backdrop-blur-xl text-amber-200 animate-view">
          <div className="w-7 h-7 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
            <CircleCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-xs sm:text-sm font-semibold tracking-wide leading-snug">{toast.message}</span>
        </div>
      )}

      <Sidebar />

      <main className="flex-1 lg:h-full flex flex-col min-w-0 lg:overflow-hidden z-10">
        <Header />

        <div key={activeTab} className="flex-1 lg:overflow-y-auto p-3 sm:p-5 lg:p-7 pb-24 lg:pb-8 animate-view">
          {activeTab === "pos" && <PosView />}
          {activeTab === "esnaf" && <EsnafView />}
          {activeTab === "inventory" && <InventoryView />}
          {activeTab === "analytics" && <AnalyticsView />}
          {activeTab === "staff" && <StaffView />}
          {activeTab === "finance" && <FinanceView />}
          {activeTab === "settings" && <SettingsView />}
        </div>
      </main>

      <DealerStudioModal />
      <PosModals />
    </div>
  );
}

export default function App() {
  return (
    <PosProvider>
      <PosShell />
    </PosProvider>
  );
}
