"use client";

import { ReactNode, useEffect } from "react";

type ModalProps = {
  open?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  side?: "right" | "center";
  widthClassName?: string;
};

export const Modal = (props: ModalProps) => {
  const open = props.open ?? props.isOpen ?? false;
  const onClose = props.onClose;
  const title = props.title;
  const children = props.children;
  const side = props.side ?? "center";
  const widthClassName = props.widthClassName;

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const panelBase =
    side === "right"
      ? `absolute right-0 top-0 h-full w-full max-w-[520px] bg-white shadow-xl ${widthClassName ?? ""}`
      : `relative w-full max-w-lg rounded-3xl bg-white shadow-xl ${widthClassName ?? ""}`;

  const panelWrap = side === "right" ? "absolute inset-0" : "flex min-h-screen items-center justify-center p-6";

  return (
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={panelWrap}>
        <div className={panelBase} onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div className="text-sm font-semibold text-gray-900">{title ?? ""}</div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-2 py-1 text-gray-400 hover:bg-gray-50 hover:text-gray-700"
              aria-label="Закрыть"
            >
              ×
            </button>
          </div>
          <div className={side === "right" ? "h-[calc(100%-56px)] overflow-auto p-5" : "p-6"}>{children}</div>
        </div>
      </div>
    </div>
  );
};
