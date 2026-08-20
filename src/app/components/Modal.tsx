"use client";
import { useEffect } from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  zIndex?: number;
  size?: "sm" | "md" | "lg";
  showClose?: boolean;
}

export function Modal({ open, onClose, title, subtitle, icon, children, zIndex = 60, size = "md", showClose = true }: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  const sizeClass = size === "sm" ? "max-w-sm" : size === "lg" ? "max-w-2xl" : "max-w-md";

  return (
    <div
      className="fixed inset-0 flex items-end justify-center sm:items-center"
      style={{ zIndex }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fadeIn"
        onClick={onClose}
      />
      {/* Panel */}
      <div
        className={`relative w-full ${sizeClass} mx-auto mb-0 sm:mb-0 max-h-[92vh] overflow-y-auto no-scrollbar glass-strong rounded-t-3xl sm:rounded-3xl animate-slideUp`}
        style={{ zIndex: zIndex + 1 }}
      >
        {/* Gold top hairline */}
        <div className="absolute top-0 right-0 left-0 h-px bg-gradient-to-r from-transparent via-[var(--gold-light)]/60 to-transparent" />

        {/* Header */}
        {(title || showClose) && (
          <div className="sticky top-0 z-10 flex items-start gap-3 p-5 pb-3 bg-[rgba(19,17,26,0.92)] backdrop-blur-xl">
            {icon && (
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl gradient-luxe shadow-[0_0_20px_-4px_rgba(255,215,0,0.55)]">
                {icon}
              </div>
            )}
            <div className="flex-1 min-w-0">
              {title && <h3 className="text-lg font-black text-gradient-luxe leading-snug">{title}</h3>}
              {subtitle && <p className="mt-0.5 text-xs text-zinc-400 leading-relaxed">{subtitle}</p>}
            </div>
            {showClose && (
              <button
                onClick={onClose}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-zinc-400 transition hover:border-[var(--color-primary)]/40 hover:text-[var(--color-primary)]"
                aria-label="إغلاق"
              >
                <X size={16} />
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="px-5 pb-6 pt-2">{children}</div>
      </div>
    </div>
  );
}
