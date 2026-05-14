import MobileShell from "../../components/prototype/MobileShell";
import ActionCard from "../../components/prototype/ActionCard";
import MembershipCard from "../../components/prototype/MembershipCard";
import PrimaryCTA from "../../components/prototype/PrimaryCTA";
import { accountTrustProfile } from "@/lib/trustSetupData";

export default function CompanyMembershipPage() {
  return (
    <MobileShell title="Company membership" subtitle="Join, create, or switch company context before taking company-level actions." backHref="/account/setup">
      <ActionCard eyebrow="Current company" title={accountTrustProfile.currentCompany} detail="You are currently acting inside this company context for trust, permissions, and release controls.">
        <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
          <p className="text-xs text-neutral-500">Current role</p>
          <p className="mt-1 text-sm font-semibold text-white">{accountTrustProfile.companyRole}</p>
        </div>
      </ActionCard>

      <ActionCard eyebrow="Memberships" title="My company memberships" detail="Each company carries its own role and authority boundaries.">
        <div className="space-y-3">
          {accountTrustProfile.companyMemberships.map((membership) => (
            <MembershipCard
              key={membership.id}
              companyName={membership.companyName}
              role={membership.role}
              context={membership.context}
              status={membership.status}
            />
          ))}
        </div>
      </ActionCard>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm font-semibold text-white">Join existing company</div>
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm font-semibold text-white">Create company</div>
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm font-semibold text-white">Switch company</div>
      </div>

      <PrimaryCTA href="/account/company-permissions">Review permissions</PrimaryCTA>
    </MobileShell>
  );
}
