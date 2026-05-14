"use client";

export type PreviewAttachment = {
  id: string;
  name: string;
  type: "image" | "file";
  url?: string;
  fileType?: string;
};

export default function AttachmentModal({
  attachment,
  onClose,
}: {
  attachment: PreviewAttachment | null;
  onClose: () => void;
}) {
  if (!attachment) return null;

  const typeLabel = attachment.fileType ?? getFileType(attachment.name, attachment.type);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B0F1A]/70 px-5 py-8" role="dialog" aria-modal="true">
      <div className="max-h-full w-full max-w-[420px] overflow-hidden rounded-[22px] bg-white shadow-[0_24px_70px_rgba(11,15,26,0.32)]">
        <div className="flex items-center justify-between gap-3 border-b border-[#E6E8EC] px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#0B0F1A]" title={attachment.name}>{attachment.name}</p>
            <p className="mt-0.5 text-xs font-medium uppercase tracking-[0.1em] text-[#667085]">{typeLabel}</p>
          </div>
          <button type="button" onClick={onClose} className="shrink-0 rounded-full border border-[#D7DBE2] px-3 py-1.5 text-xs font-semibold text-[#102345]">
            Close
          </button>
        </div>

        <div className="max-h-[68vh] overflow-auto bg-[#F7F8FA] p-4">
          {attachment.type === "image" && attachment.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={attachment.url} alt={attachment.name} className="mx-auto max-h-[60vh] w-full rounded-xl object-contain" />
          ) : (
            <div className="flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-[#D7DBE2] bg-white px-5 text-center">
              <span className="rounded-lg bg-[#EEF0F3] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-[#667085]">{typeLabel}</span>
              <p className="mt-3 max-w-full break-words text-sm font-semibold text-[#0B0F1A]">{attachment.name}</p>
              <p className="mt-2 text-xs leading-5 text-[#667085]">File preview is available in-place for workflow review.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getFileType(name: string, type: PreviewAttachment["type"]) {
  if (type === "image") return "Image";
  const source = name.toLowerCase();
  if (source.includes("pdf") || source.includes("certificate")) return "PDF";
  if (source.includes("doc") || source.includes("note")) return "DOC";
  if (source.includes("plan") || source.includes("drawing")) return "PLAN";
  if (source.includes("regulation") || source.includes("compliance")) return "REG";
  const extension = name.split(".").pop();
  return extension && extension !== name ? extension.toUpperCase() : "FILE";
}
