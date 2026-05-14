"use client";

import { useEffect, useRef } from "react";

import type { Contact } from "@/lib/contactIdentity";
import { getContactIdentity, getContactInitials } from "@/lib/contactIdentity";

export default function ContactIdentityPanel({
  contact,
  onClose,
}: {
  contact: Contact | null;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!contact) return;

    const panel = panelRef.current;
    const selectors = [
      "button",
      "a[href]",
      "input",
      "textarea",
      "select",
      "[tabindex]:not([tabindex='-1'])",
    ].join(",");

    const keyHandler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key === "Tab" && panel) {
        const focusable = Array.from(panel.querySelectorAll<HTMLElement>(selectors)).filter(
          (element) => !element.hasAttribute("disabled"),
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", keyHandler);
    const firstFocusable = panel?.querySelector<HTMLElement>(selectors);
    firstFocusable?.focus();

    return () => document.removeEventListener("keydown", keyHandler);
  }, [contact, onClose]);

  if (!contact) return null;
  const resolvedContact = getContactIdentity(contact.id, contact.contractContext);

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/20" aria-modal="true" role="dialog">
      <button type="button" className="absolute inset-0" aria-label="Close contact identity panel" onClick={onClose} />
      <div
        ref={panelRef}
        className="relative z-10 w-full rounded-t-[24px] bg-white px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4 shadow-[0_-12px_30px_rgba(15,23,42,0.12)]"
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-[#E5E7EB]" />
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#EAF0FF] text-lg font-semibold text-[#102345]">
              {getContactInitials(resolvedContact)}
            </div>
            <div>
              <p className="text-lg font-semibold text-[#0B0F1A]">{resolvedContact.name}</p>
              <p className="mt-1 text-sm font-medium text-[#102345]">{resolvedContact.projectRole ?? resolvedContact.companyRoleTitle ?? formatRole(resolvedContact.role)}</p>
              <p className="mt-1 text-sm text-[#667085]">{resolvedContact.organisation}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[#E5E7EB] px-3 py-2 text-sm font-medium text-[#667085]"
          >
            Close
          </button>
        </div>

        <div className="mt-5 space-y-3">
          <InfoRow label="Name" value={resolvedContact.name} />
          <InfoRow label="Project role" value={resolvedContact.projectRole ?? resolvedContact.companyRoleTitle ?? formatRole(resolvedContact.role)} />
          <InfoRow label="Organisation" value={resolvedContact.organisation} />
          {contact.workflowContext ? <InfoRow label="Workflow context" value={contact.workflowContext} /> : null}
          {resolvedContact.email ? <InfoRow label="Email" value={resolvedContact.email} /> : null}
          {resolvedContact.phone ? <InfoRow label="Phone" value={resolvedContact.phone} /> : null}
          {resolvedContact.about ? <InfoRow label="About" value={resolvedContact.about} /> : null}
          {resolvedContact.authorityTags?.length ? <TagRow label="Authority tags" tags={resolvedContact.authorityTags} /> : null}
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          {resolvedContact.phone ? (
            <a href={`sms:${resolvedContact.phone}`} className="rounded-2xl bg-[#102345] px-4 py-3 text-center text-sm font-semibold text-white">
              Message
            </a>
          ) : resolvedContact.email ? (
            <a href={`mailto:${resolvedContact.email}?subject=Shure.Fund`} className="rounded-2xl bg-[#102345] px-4 py-3 text-center text-sm font-semibold text-white">
              Message
            </a>
          ) : (
            <div className="rounded-2xl bg-[#E5E7EB] px-4 py-3 text-center text-sm font-semibold text-[#98A2B3]">
              Message
            </div>
          )}
          {resolvedContact.phone ? (
            <a href={`tel:${resolvedContact.phone}`} className="rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-center text-sm font-semibold text-[#102345]">
              Call
            </a>
          ) : (
            <div className="rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-3 text-center text-sm font-semibold text-[#98A2B3]">
              Call
            </div>
          )}
          {resolvedContact.email ? (
            <a href={`mailto:${resolvedContact.email}`} className="rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-center text-sm font-semibold text-[#102345]">
              Email
            </a>
          ) : (
            <div className="rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-3 text-center text-sm font-semibold text-[#98A2B3]">
              Email
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TagRow({
  label,
  tags,
}: {
  label: string;
  tags: string[];
}) {
  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-3">
      <p className="text-xs uppercase tracking-[0.16em] text-[#667085]">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span key={tag} className="rounded-full border border-[#D7DBE2] bg-white px-2.5 py-1 text-xs font-medium text-[#102345]">
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-3">
      <p className="text-xs uppercase tracking-[0.16em] text-[#667085]">{label}</p>
      <p className="mt-2 text-sm leading-6 text-[#0B0F1A]">{value}</p>
    </div>
  );
}

function formatRole(role: string) {
  if (role === "qs") return "Quantity Surveyor";
  if (role === "funder") return "Funder";
  if (role === "contractor") return "Contractor";
  return role;
}
