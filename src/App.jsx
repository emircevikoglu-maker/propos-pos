import React from "react";
import { PosProvider, usePos } from "./context/PosContext";
import { Shell } from "./ui/Shell";
import { DeviceGate } from "./components/auth/DeviceGate";
import { FeedbackSheet } from "./components/auth/FeedbackSheet";

function PosShell() {
  const { ACTIVE_TENANT_ID, activeTab } = usePos();
  return (
    <>
      <Shell />
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
