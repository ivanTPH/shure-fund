import MobileShell from "../../../components/prototype/MobileShell";
import ActionCard from "../../../components/prototype/ActionCard";
import PrimaryCTA from "../../../components/prototype/PrimaryCTA";
import StatusBadge from "../../../components/prototype/StatusBadge";
import { accountTrustProfile } from "@/lib/trustSetupData";

export default function KYCVerificationPage() {
  return (
    <MobileShell title="Verify identity" subtitle="Trust checks are completed once and then reused when you approve, release, or administer companies." backHref="/account/setup">
      <ActionCard eyebrow="Verification status" title="Identity verification" detail="Provide your legal identity and document details so the system can trust your approvals and company actions.">
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
          <div>
            <p className="text-xs text-neutral-500">Current status</p>
            <p className="mt-1 text-sm font-semibold text-white">Verification in motion</p>
          </div>
          <StatusBadge status={accountTrustProfile.identityVerificationStatus} />
        </div>
      </ActionCard>

      <ActionCard eyebrow="Identity details" title="Legal identity">
        <Field label="Legal name" value={accountTrustProfile.legalName} />
        <Field label="Date of birth" value={accountTrustProfile.dateOfBirth} />
        <Field label="Mobile number" value={accountTrustProfile.mobileNumber} />
        <Field label="Country of residence" value={accountTrustProfile.countryOfResidence} />
        <Field label="Document type" value={accountTrustProfile.documentType} />
      </ActionCard>

      <ActionCard eyebrow="Document capture" title="Passport or driving licence">
        <div className="grid grid-cols-2 gap-3">
          <CaptureSlot label="Front capture" />
          <CaptureSlot label="Back capture" />
        </div>
      </ActionCard>

      <PrimaryCTA href="/account/company-membership">Continue verification</PrimaryCTA>
    </MobileShell>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function CaptureSlot({
  label,
}: {
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 px-4 py-8 text-center text-sm font-medium text-neutral-300">
      {label}
    </div>
  );
}
