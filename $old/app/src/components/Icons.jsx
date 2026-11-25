import React from "react";

const createIcon = (nodes) =>
  React.forwardRef(({ className = "", size = 24, color = "currentColor", strokeWidth = 2, children, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`lucide ${className}`.trim()}
      {...props}
    >
      {nodes.map(([Tag, attrs], idx) => (
        <Tag key={attrs.key || idx} {...attrs} />
      ))}
      {children}
    </svg>
  ));

export const ArrowRightLeft = createIcon([
  ["path", { d: "m16 3 4 4-4 4" }],
  ["path", { d: "M20 7H4" }],
  ["path", { d: "m8 21-4-4 4-4" }],
  ["path", { d: "M4 17h16" }]
]);

export const ArrowUpRight = createIcon([
  ["path", { d: "M7 7h10v10" }],
  ["path", { d: "M7 17 17 7" }]
]);

export const Banknote = createIcon([
  ["rect", { width: "20", height: "12", x: "2", y: "6", rx: "2" }],
  ["circle", { cx: "12", cy: "12", r: "2" }],
  ["path", { d: "M6 12h.01M18 12h.01" }]
]);

export const BookOpen = createIcon([
  ["path", { d: "M12 7v14" }],
  ["path", { d: "M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" }]
]);

export const ChartColumn = createIcon([
  ["path", { d: "M3 3v16a2 2 0 0 0 2 2h16" }],
  ["path", { d: "M18 17V9" }],
  ["path", { d: "M13 17V5" }],
  ["path", { d: "M8 17v-3" }]
]);

export const CircleCheck = createIcon([
  ["circle", { cx: "12", cy: "12", r: "10" }],
  ["path", { d: "m9 12 2 2 4-4" }]
]);

export const CirclePlus = createIcon([
  ["circle", { cx: "12", cy: "12", r: "10" }],
  ["path", { d: "M8 12h8" }],
  ["path", { d: "M12 8v8" }]
]);

export const Clock = createIcon([
  ["circle", { cx: "12", cy: "12", r: "10" }],
  ["polyline", { points: "12 6 12 12 16 14" }]
]);

export const Cloud = createIcon([
  ["path", { d: "M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" }]
]);

export const Coffee = createIcon([
  ["path", { d: "M10 2v2" }],
  ["path", { d: "M14 2v2" }],
  ["path", { d: "M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1" }],
  ["path", { d: "M6 2v2" }]
]);

export const Copy = createIcon([
  ["rect", { width: "14", height: "14", x: "8", y: "8", rx: "2", ry: "2" }],
  ["path", { d: "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" }]
]);

export const CreditCard = createIcon([
  ["rect", { width: "20", height: "14", x: "2", y: "5", rx: "2" }],
  ["line", { x1: "2", x2: "22", y1: "10", y2: "10" }]
]);

export const DollarSign = createIcon([
  ["line", { x1: "12", x2: "12", y1: "2", y2: "22" }],
  ["path", { d: "M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" }]
]);

export const Download = createIcon([
  ["path", { d: "M12 15V3" }],
  ["path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }],
  ["path", { d: "m7 10 5 5 5-5" }]
]);

export const Eye = createIcon([
  ["path", { d: "M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" }],
  ["circle", { cx: "12", cy: "12", r: "3" }]
]);

export const Flame = createIcon([
  ["path", { d: "M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" }]
]);

export const Gift = createIcon([
  ["rect", { x: "3", y: "8", width: "18", height: "4", rx: "1" }],
  ["path", { d: "M12 8v13" }],
  ["path", { d: "M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" }],
  ["path", { d: "M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5" }]
]);

export const KeyRound = createIcon([
  ["path", { d: "M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z" }],
  ["circle", { cx: "16.5", cy: "7.5", r: ".5", fill: "currentColor" }]
]);

export const LayoutGrid = createIcon([
  ["rect", { width: "7", height: "7", x: "3", y: "3", rx: "1" }],
  ["rect", { width: "7", height: "7", x: "14", y: "3", rx: "1" }],
  ["rect", { width: "7", height: "7", x: "14", y: "14", rx: "1" }],
  ["rect", { width: "7", height: "7", x: "3", y: "14", rx: "1" }]
]);

export const LockOpen = createIcon([
  ["rect", { width: "18", height: "11", x: "3", y: "11", rx: "2", ry: "2" }],
  ["path", { d: "M7 11V7a5 5 0 0 1 9.9-1" }]
]);

export const Lock = createIcon([
  ["rect", { width: "18", height: "11", x: "3", y: "11", rx: "2", ry: "2" }],
  ["path", { d: "M7 11V7a5 5 0 0 1 10 0v4" }]
]);

export const Minus = createIcon([
  ["path", { d: "M5 12h14" }]
]);

export const Package = createIcon([
  ["path", { d: "M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z" }],
  ["path", { d: "M12 22V12" }],
  ["polyline", { points: "3.29 7 12 12 20.71 7" }],
  ["path", { d: "m7.5 4.27 9 5.15" }]
]);

export const PenLine = createIcon([
  ["path", { d: "M12 20h9" }],
  ["path", { d: "M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" }]
]);

export const Percent = createIcon([
  ["line", { x1: "19", x2: "5", y1: "5", y2: "19" }],
  ["circle", { cx: "6.5", cy: "6.5", r: "2.5" }],
  ["circle", { cx: "17.5", cy: "17.5", r: "2.5" }]
]);

export const Phone = createIcon([
  ["path", { d: "M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384" }]
]);

export const Plus = createIcon([
  ["path", { d: "M5 12h14" }],
  ["path", { d: "M12 5v14" }]
]);

export const Receipt = createIcon([
  ["path", { d: "M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" }],
  ["path", { d: "M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" }],
  ["path", { d: "M12 17.5v-11" }]
]);

export const RefreshCw = createIcon([
  ["path", { d: "M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" }],
  ["path", { d: "M21 3v5h-5" }],
  ["path", { d: "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" }],
  ["path", { d: "M8 16H3v5" }]
]);

export const RotateCcw = createIcon([
  ["path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" }],
  ["path", { d: "M3 3v5h5" }]
]);

export const Search = createIcon([
  ["path", { d: "m21 21-4.34-4.34" }],
  ["circle", { cx: "11", cy: "11", r: "8" }]
]);

export const Settings = createIcon([
  ["path", { d: "M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" }],
  ["circle", { cx: "12", cy: "12", r: "3" }]
]);

export const ShoppingBag = createIcon([
  ["path", { d: "M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" }],
  ["path", { d: "M3 6h18" }],
  ["path", { d: "M16 10a4 4 0 0 1-8 0" }]
]);

export const Smartphone = createIcon([
  ["rect", { width: "14", height: "20", x: "5", y: "2", rx: "2", ry: "2" }],
  ["path", { d: "M12 18h.01" }]
]);

export const Store = createIcon([
  ["path", { d: "m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" }],
  ["path", { d: "M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" }],
  ["path", { d: "M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" }],
  ["path", { d: "M2 7h20" }],
  ["path", { d: "M22 7v3a2 2 0 0 1-2 2a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7" }]
]);

export const Ticket = createIcon([
  ["path", { d: "M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" }],
  ["path", { d: "M13 5v2" }],
  ["path", { d: "M13 17v2" }],
  ["path", { d: "M13 11v2" }]
]);

export const Trash2 = createIcon([
  ["path", { d: "M3 6h18" }],
  ["path", { d: "M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" }],
  ["path", { d: "M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" }],
  ["line", { x1: "10", x2: "10", y1: "11", y2: "17" }],
  ["line", { x1: "14", x2: "14", y1: "11", y2: "17" }]
]);

export const TrendingUp = createIcon([
  ["path", { d: "M16 7h6v6" }],
  ["path", { d: "m22 7-8.5 8.5-5-5L2 17" }]
]);

export const TriangleAlert = createIcon([
  ["path", { d: "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" }],
  ["path", { d: "M12 9v4" }],
  ["path", { d: "M12 17h.01" }]
]);

export const Users = createIcon([
  ["path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" }],
  ["path", { d: "M16 3.128a4 4 0 0 1 0 7.744" }],
  ["path", { d: "M22 21v-2a4 4 0 0 0-3-3.87" }],
  ["circle", { cx: "9", cy: "7", r: "4" }]
]);

export const Wallet = createIcon([
  ["path", { d: "M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" }],
  ["path", { d: "M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" }]
]);

export const X = createIcon([
  ["path", { d: "M18 6 6 18" }],
  ["path", { d: "m6 6 12 12" }]
]);

export const Zap = createIcon([
  ["path", { d: "M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" }]
]);
