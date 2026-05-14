import type { ApprovalReleaseRecord } from "@/lib/approvalReleaseData";
import { mapUserToContact } from "@/lib/contactIdentity";

import ClickableAvatar from "./ClickableAvatar";

export default function ApprovalContextCard({
  record,
}: {
  record: ApprovalReleaseRecord;
}) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-5 shadow-[0_18px_44px_rgba(0,0,0,0.22)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--brand-aqua)]">Approval context</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <ContactMetric
          label="Submitted by"
          value={record.submittedBy}
          contact={mapUserToContact(record.submittedBy, "contractor", record.deliveryParty)}
        />
        <ContactMetric
          label="Delivery party"
          value={record.deliveryParty}
          contact={mapUserToContact(record.deliveryParty, "contractor", record.deliveryParty)}
        />
        <ContactMetric
          label="Current reviewer"
          value={record.currentReviewer}
          contact={mapUserToContact(record.currentReviewer, "qs")}
        />
        <ContactMetric
          label="Next approver"
          value={record.nextApprover}
          contact={mapUserToContact(record.nextApprover, "funder")}
        />
      </div>
      <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
        <p className="text-xs uppercase tracking-[0.16em] text-neutral-500">Funding state</p>
        <p className="mt-2 text-sm font-medium text-white">{record.fundingState}</p>
      </div>
    </section>
  );
}

function ContactMetric({
  label,
  value,
  contact,
}: {
  label: string;
  value: string;
  contact: ReturnType<typeof mapUserToContact>;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
      <p className="text-xs text-neutral-500">{label}</p>
      <ClickableAvatar contact={contact}>
        <div className="mt-2 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EAF0FF] text-xs font-semibold text-[#102345]">
            {contact.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}
          </span>
          <p className="text-sm font-semibold text-white">{value}</p>
        </div>
      </ClickableAvatar>
    </div>
  );
}
