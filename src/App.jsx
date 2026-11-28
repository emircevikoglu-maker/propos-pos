import React from "react";
import { PosProvider, usePos } from "./context/PosContext";
import { hexToRgbTuple } from "./utils/formatters";
import { PosModals } from "./components/modals/PosModals";
import { Shell } from "./ui/Shell";
import { DeviceGate } from "./components/auth/DeviceGate";
import { FeedbackSheet } from "./components/auth/FeedbackSheet";

function PosShell() {
  const { ACTIVE_TENANT_ID, brandSettings, activeTab } = usePos();

  const primaryRgb = hexToRgbTuple(brandSettings.customPrimary);
  const secondaryRgb = hexToRgbTuple(brandSettings.customSecondary);

  return (
    <>
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

      <Shell />

      <PosModals />
      <FeedbackSheet tenantId={ACTIVE_TENANT_ID} screen={activeTab} />
    </>
  );
}

export default function App() {
  return (
    <DeviceGate>
      <PosProvider>
        <PosShell />
      </PosProvider>
    </DeviceGate>
  );
}
