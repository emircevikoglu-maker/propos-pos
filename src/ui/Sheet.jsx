import React from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { PPMotion as M } from "../design/motion";
import { SHEET_PARAM } from "./routes";
import { Ic } from "./Ic";

/**
 * Açık pencere URL'de tutulur (?s=ad): geri tuşu önce pencereyi kapatır, yenileme pencereyi korur.
 * Açma = geçmişe girdi ekler (state.sheet), kapama = o girdiyi geri alır; derin bağlantıda yerine koyar.
 */
export function useSheet() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const current = params.get(SHEET_PARAM);
  const open = React.useCallback((name) => {
    navigate({ pathname: location.pathname, search: `?${SHEET_PARAM}=${encodeURIComponent(name)}` }, { state: { ...(location.state || {}), sheet: true } });
  }, [navigate, location.pathname, location.state]);
  const close = React.useCallback(() => {
    if (location.state && location.state.sheet) navigate(-1);
    else navigate({ pathname: location.pathname }, { replace: true, state: location.state });
  }, [navigate, location.pathname, location.state]);
  /** Açık pencereyi başka bir pencereyle değiştirir (geçmişe ikinci girdi eklemez). */
  const swap = React.useCallback((name) => {
    navigate({ pathname: location.pathname, search: `?${SHEET_PARAM}=${encodeURIComponent(name)}` }, { replace: true, state: location.state });
  }, [navigate, location.pathname, location.state]);
  return { current, open, close, swap };
}

/**
 * Açık/kapalı bilgisi bağlamda duran pencereyi URL ile eşler: açılınca ?s=ad eklenir, geri tuşu URL'yi
 * kaldırınca `onGone` durumu temizler, durum koddan temizlenirse URL de kapanır.
 */
export function useStateSheet(name, isOpen, onGone) {
  const sheet = useSheet();
  const shown = React.useRef(false);
  React.useEffect(() => {
    if (isOpen && sheet.current !== name && !shown.current) { if (sheet.current) sheet.swap(name); else sheet.open(name); }
    else if (!isOpen && shown.current && sheet.current === name) { shown.current = false; sheet.close(); }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    if (sheet.current === name) shown.current = true;
    else if (shown.current) { shown.current = false; if (isOpen) onGone(); }
  }, [sheet.current]); // eslint-disable-line react-hooks/exhaustive-deps
  return { visible: isOpen && sheet.current === name, close: sheet.close };
}

/** Prototipteki openSheet'in React karşılığı: aynı işaretleme, aynı giriş/çıkış hareketi, Esc ve arka plana tıkla kapatır. */
export function Sheet({ onClose, title, label, children, foot, width }) {
  const wrapRef = React.useRef(null);
  const sheetRef = React.useRef(null);
  const backRef = React.useRef(null);
  const closing = React.useRef(false);

  React.useEffect(() => {
    M.anim(backRef.current, [{ opacity: 0 }, { opacity: 1 }], { duration: 180 });
    M.anim(sheetRef.current, [{ opacity: 0, transform: "translateY(28px) scale(.98)" }, { opacity: 1, transform: "none" }], { duration: 260, easing: M.EASE.out });
    const key = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", key);
    const prevFocus = document.activeElement;
    return () => { window.removeEventListener("keydown", key); if (prevFocus && prevFocus.focus) try { prevFocus.focus(); } catch (e) { /* yok say */ } };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const requestClose = () => { if (closing.current) return; closing.current = true; onClose(); };

  return createPortal(
    <div className="sheet-wrap" ref={wrapRef}>
      <div className="sheet-back" ref={backRef} onClick={requestClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} ref={sheetRef} style={width ? { width } : undefined}>
        <div className="sheet-head">
          <div>
            {label && <div className="label">{label}</div>}
            <h2 className="sheet-title">{title}</h2>
          </div>
          <button type="button" className="btn btn-ghost btn-icon" onClick={requestClose} aria-label="Kapat"><Ic n="x" /></button>
        </div>
        {children}
        {foot && <div className="sheet-foot">{foot}</div>}
      </div>
    </div>,
    document.body
  );
}
