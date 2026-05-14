import MobileShell from "../../components/prototype/MobileShell";
import ActionCard from "../../components/prototype/ActionCard";
import SetupStatusCard from "../../components/prototype/SetupStatusCard";
import { accountTrustProfile } from "@/lib/trustSetupData";

export default function AccountSetupHubPage() {
  return (
    <MobileShell title="Complete your setup" subtitle="Identity, company, and permissions control which workflow actions you can take across live contracts.">
      <ActionCard
        eyebrow="Trust setup"
        title="Complete your setup"
        detail="Trusted user entry sits ahead of company membership and permissions so approvals and funding decisions always carry the right authority."
      />

      <div className="space-y-3">
        {accountTrustProfile.setupSteps.map((step) => (
          <SetupStatusCard
            key={step.id}
            title={step.title}
            detail={step.detail}
            status={step.status}
            href={step.href}
          />
        ))}
      </div>
    </MobileShell>
  );
}
