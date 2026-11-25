import React from "react";
import { mountIcons } from "../design/icons";

mountIcons();

/** Tek ikon seti (src/design/icons.js sprite'ı). `n` = ikon adı. */
export const Ic = ({ n, className = "" }) => (
  <svg className={`ic ${className}`.trim()} aria-hidden="true"><use href={`#i-${n}`} /></svg>
);
