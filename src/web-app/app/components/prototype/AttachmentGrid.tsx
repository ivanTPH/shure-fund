"use client";

import { useState } from "react";
import ArticleOutlined from "@mui/icons-material/ArticleOutlined";
import DescriptionOutlined from "@mui/icons-material/DescriptionOutlined";
import GavelOutlined from "@mui/icons-material/GavelOutlined";
import InsertDriveFileOutlined from "@mui/icons-material/InsertDriveFileOutlined";
import MapOutlined from "@mui/icons-material/MapOutlined";
import ZoomInOutlined from "@mui/icons-material/ZoomInOutlined";

import AttachmentModal, { type PreviewAttachment } from "./AttachmentModal";

export default function AttachmentGrid({
  attachments,
  showDetails = false,
  layout = "grid",
}: {
  attachments: PreviewAttachment[];
  showDetails?: boolean;
  layout?: "grid" | "list";
}) {
  const [activeAttachment, setActiveAttachment] = useState<PreviewAttachment | null>(null);

  if (attachments.length === 0) return null;

  return (
    <div className="min-w-0">
      {layout === "grid" ? (
        <div className="grid grid-cols-4 gap-2">
        {attachments.map((attachment) => {
          const fileType = getVisualFileType(attachment);
          return (
          <button
            key={attachment.id}
            type="button"
            onClick={() => setActiveAttachment(attachment)}
            className="group min-w-0 text-left"
            title={attachment.name}
            aria-label={`Open ${attachment.name}`}
          >
            <span className="relative block aspect-square overflow-hidden rounded-xl border border-[#D7DBE2] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition group-active:scale-[0.98]">
              {attachment.type === "image" && attachment.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={attachment.url} alt={attachment.name} className="h-full w-full object-cover" />
              ) : (
                <DocumentThumbnail fileType={fileType} />
              )}
              <span className={`absolute left-1.5 top-1.5 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.04em] ${badgeClass(fileType)}`}>
                {fileType}
              </span>
              <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#0B0F1A]/72 text-white">
                <ZoomInOutlined style={{ fontSize: 13 }} />
              </span>
            </span>
            <span className="mt-1 block truncate text-[10px] font-medium leading-4 text-[#667085]">{attachment.name}</span>
          </button>
        );})}
        </div>
      ) : null}

      {showDetails || layout === "list" ? (
        <div className={`${layout === "grid" ? "mt-3" : ""} divide-y divide-[#E6E8EC] rounded-2xl border border-[#E6E8EC] bg-white`}>
          {attachments.map((attachment) => {
            const fileType = getVisualFileType(attachment);
            return (
              <button
                key={`${attachment.id}-detail`}
                type="button"
                onClick={() => setActiveAttachment(attachment)}
                className="flex w-full min-w-0 items-center gap-3 px-3 py-2 text-left"
                title={`Open ${attachment.name}`}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#D7DBE2] bg-[#F7F8FA] text-[#667085]">
                  <DocumentThumbnailIcon fileType={fileType} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-[#0B0F1A]">{attachment.name}</span>
                  <span className="mt-0.5 block text-[11px] font-medium text-[#667085]">{fileType} file</span>
                </span>
                <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.04em] ${badgeClass(fileType)}`}>{fileType}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      <AttachmentModal attachment={activeAttachment} onClose={() => setActiveAttachment(null)} />
    </div>
  );
}

function DocumentThumbnail({ fileType }: { fileType: string }) {
  return (
    <span className="flex h-full w-full flex-col items-center justify-center bg-[#F7F8FA] px-2 text-[#667085]">
      <span className="flex h-10 w-8 items-center justify-center rounded-md border border-[#D7DBE2] bg-white shadow-sm">
        <DocumentThumbnailIcon fileType={fileType} />
      </span>
      <span className="mt-2 h-1 w-9 rounded-full bg-[#D7DBE2]" />
      <span className="mt-1 h-1 w-7 rounded-full bg-[#E6E8EC]" />
    </span>
  );
}

function DocumentThumbnailIcon({ fileType }: { fileType: string }) {
  const icon = fileType === "PDF"
    ? <DescriptionOutlined style={{ fontSize: 28 }} />
    : fileType === "DOC"
      ? <ArticleOutlined style={{ fontSize: 28 }} />
      : fileType === "PLAN"
        ? <MapOutlined style={{ fontSize: 28 }} />
        : fileType === "REG"
          ? <GavelOutlined style={{ fontSize: 28 }} />
      : <InsertDriveFileOutlined style={{ fontSize: 28 }} />;

  return icon;
}

function getVisualFileType(attachment: PreviewAttachment) {
  if (attachment.type === "image") return "IMG";
  const source = `${attachment.fileType ?? ""} ${attachment.name}`.toLowerCase();
  if (source.includes("pdf") || source.includes("certificate")) return "PDF";
  if (source.includes("doc") || source.includes("note")) return "DOC";
  if (source.includes("plan") || source.includes("drawing")) return "PLAN";
  if (source.includes("reg") || source.includes("compliance")) return "REG";
  return "FILE";
}

function badgeClass(fileType: string) {
  if (fileType === "PDF") return "bg-[#FEF2F2] text-[#B42318]";
  if (fileType === "DOC") return "bg-[#EAF0FF] text-[#102345]";
  if (fileType === "PLAN") return "bg-[#EAF8EE] text-[#047857]";
  if (fileType === "REG") return "bg-[#F4F3FF] text-[#5B21B6]";
  if (fileType === "IMG") return "bg-[#0B0F1A]/72 text-white";
  return "bg-[#EEF0F3] text-[#667085]";
}
