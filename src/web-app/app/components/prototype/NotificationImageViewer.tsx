"use client";

import { type WheelEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import CloseOutlined from "@mui/icons-material/CloseOutlined";
import DeleteOutlineOutlined from "@mui/icons-material/DeleteOutlineOutlined";
import RefreshOutlined from "@mui/icons-material/RefreshOutlined";
import RemoveOutlined from "@mui/icons-material/RemoveOutlined";
import AddOutlined from "@mui/icons-material/AddOutlined";
import NavigateBeforeOutlined from "@mui/icons-material/NavigateBeforeOutlined";
import NavigateNextOutlined from "@mui/icons-material/NavigateNextOutlined";

export type NotificationImageViewerImage = {
  id: string;
  title: string;
  url?: string;
  uploadedByName?: string;
  uploadedByRole?: string;
  timestamp: string;
};

type NotificationImageViewerProps = {
  isOpen: boolean;
  images: NotificationImageViewerImage[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onClose: () => void;
  onDelete?: (imageId: string) => void;
  canDelete: boolean;
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;
const CLICK_ZOOM = 1.75;

export default function NotificationImageViewer({
  isOpen,
  images,
  activeIndex,
  onActiveIndexChange,
  onClose,
  onDelete,
  canDelete,
}: NotificationImageViewerProps) {
  const [zoomLevel, setZoomLevel] = useState(MIN_ZOOM);
  const [imageFailed, setImageFailed] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusedElementRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const activeImage = images[activeIndex] ?? null;
  const metaLabel = useMemo(() => {
    if (!activeImage) return "";
    return [activeImage.uploadedByRole, activeImage.timestamp].filter(Boolean).join(" · ");
  }, [activeImage]);

  useEffect(() => {
    if (!isOpen) return;

    previousFocusedElementRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key === "ArrowLeft" && activeIndex > 0) {
        event.preventDefault();
        onActiveIndexChange(activeIndex - 1);
        return;
      }

      if (event.key === "ArrowRight" && activeIndex < images.length - 1) {
        event.preventDefault();
        onActiveIndexChange(activeIndex + 1);
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
      previousFocusedElementRef.current?.focus();
    };
  }, [activeIndex, images.length, isOpen, onActiveIndexChange, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    setZoomLevel(MIN_ZOOM);
    setImageFailed(false);
  }, [activeIndex, isOpen]);

  if (!isOpen || !activeImage) return null;

  function clampZoom(nextZoom: number) {
    return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(nextZoom.toFixed(2))));
  }

  function handleZoomIn() {
    setZoomLevel((current) => clampZoom(current + ZOOM_STEP));
  }

  function handleZoomOut() {
    setZoomLevel((current) => clampZoom(current - ZOOM_STEP));
  }

  function handleResetZoom() {
    setZoomLevel(MIN_ZOOM);
  }

  function handleWheelZoom(event: WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    setZoomLevel((current) => clampZoom(current + (event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP)));
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#020617]/88 px-3 py-4 sm:px-6" aria-hidden={!isOpen}>
      <button type="button" aria-label="Close image viewer" className="absolute inset-0 cursor-default" onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#0B1220] text-white shadow-[0_24px_80px_rgba(2,6,23,0.65)]"
      >
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p id={titleId} className="truncate text-sm font-semibold text-white">{activeImage.title}</p>
            <p className="mt-1 text-xs text-white/65">{images.length > 0 ? `${activeIndex + 1} / ${images.length}` : null}</p>
          </div>
          <div className="flex items-center gap-2">
            <ToolbarButton label="Zoom out" onClick={handleZoomOut} disabled={zoomLevel <= MIN_ZOOM}>
              <RemoveOutlined style={{ fontSize: 18 }} />
            </ToolbarButton>
            <ToolbarButton label="Zoom in" onClick={handleZoomIn} disabled={zoomLevel >= MAX_ZOOM}>
              <AddOutlined style={{ fontSize: 18 }} />
            </ToolbarButton>
            <ToolbarButton label="Reset zoom" onClick={handleResetZoom} disabled={zoomLevel === MIN_ZOOM}>
              <RefreshOutlined style={{ fontSize: 18 }} />
            </ToolbarButton>
            {canDelete && onDelete ? (
              <ToolbarButton label="Delete image" onClick={() => onDelete(activeImage.id)} className="text-[#FCA5A5] hover:bg-[#7F1D1D]/55">
                <DeleteOutlineOutlined style={{ fontSize: 18 }} />
              </ToolbarButton>
            ) : null}
            <ToolbarButton ref={closeButtonRef} label="Close viewer" onClick={onClose}>
              <CloseOutlined style={{ fontSize: 18 }} />
            </ToolbarButton>
          </div>
        </div>

        <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-4 sm:px-6">
          {images.length > 1 ? (
            <button
              type="button"
              aria-label="Previous image"
              onClick={() => onActiveIndexChange(Math.max(0, activeIndex - 1))}
              disabled={activeIndex === 0}
              className="absolute left-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-[#111827]/85 text-white transition disabled:cursor-not-allowed disabled:opacity-30"
            >
              <NavigateBeforeOutlined style={{ fontSize: 22 }} />
            </button>
          ) : null}

          <div
            className="flex h-full w-full items-center justify-center overflow-auto rounded-[24px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(148,163,184,0.16),transparent_55%),linear-gradient(180deg,rgba(15,23,42,0.92),rgba(2,6,23,0.96))]"
            onWheel={handleWheelZoom}
          >
            {activeImage.url && !imageFailed ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={activeImage.url}
                alt={activeImage.title}
                onError={() => setImageFailed(true)}
                onClick={() => setZoomLevel((current) => (current > MIN_ZOOM ? MIN_ZOOM : CLICK_ZOOM))}
                className="max-h-full max-w-full select-none object-contain transition-transform duration-150 ease-out"
                style={{ transform: `scale(${zoomLevel})` }}
              />
            ) : (
              <div className="flex max-w-md flex-col items-center justify-center rounded-[24px] border border-dashed border-white/15 bg-white/5 px-6 py-10 text-center">
                <p className="text-base font-semibold text-white">Image preview unavailable</p>
                <p className="mt-2 text-sm leading-6 text-white/70">
                  The evidence image could not be loaded here. You can close the viewer and continue inside the notification.
                </p>
              </div>
            )}
          </div>

          {images.length > 1 ? (
            <button
              type="button"
              aria-label="Next image"
              onClick={() => onActiveIndexChange(Math.min(images.length - 1, activeIndex + 1))}
              disabled={activeIndex === images.length - 1}
              className="absolute right-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-[#111827]/85 text-white transition disabled:cursor-not-allowed disabled:opacity-30"
            >
              <NavigateNextOutlined style={{ fontSize: 22 }} />
            </button>
          ) : null}
        </div>

        <div className="border-t border-white/10 px-4 py-3 sm:px-5">
          <p className="text-sm font-medium text-white/90">{activeImage.uploadedByName ?? "Unknown uploader"}</p>
          <p className="mt-1 text-xs text-white/65">{metaLabel || activeImage.timestamp}</p>
        </div>
      </div>
    </div>
  );
}

const ToolbarButton = Object.assign(
  function ToolbarButton({
    label,
    onClick,
    children,
    disabled,
    className = "",
    ref,
  }: {
    label: string;
    onClick: () => void;
    children: React.ReactNode;
    disabled?: boolean;
    className?: string;
    ref?: React.Ref<HTMLButtonElement>;
  }) {
    return (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        title={label}
        onClick={onClick}
        disabled={disabled}
        className={`flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
      >
        {children}
      </button>
    );
  },
  {},
);
