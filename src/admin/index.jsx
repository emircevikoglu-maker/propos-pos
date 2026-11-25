import React from "react";
import { createRoot } from "react-dom/client";
import AdminApp from "./AdminApp";

const el = document.getElementById("root");
if (el) createRoot(el).render(<AdminApp />);
