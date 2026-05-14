import MobileShell from "../../components/prototype/MobileShell";
import ActionCard from "../../components/prototype/ActionCard";
import PermissionRow from "../../components/prototype/PermissionRow";
import PrimaryCTA from "../../components/prototype/PrimaryCTA";
import StatusBadge from "../../components/prototype/StatusBadge";
import { accountTrustProfile } from "@/lib/trustSetupData";

const permissionOptions = [
  "Add users",
  "Edit company",
  "Add projects",
  "Add contracts",
  "Add funds",
  "Release payments",
  "Assign sign-off authority",
];

export default function CompanyPermissionsPage() {
  return (
    <MobileShell title="Company permissions" subtitle="Company authority is managed here. Contract-level sign-off is assigned separately inside live packages." backHref="/account/company-membership">
      <ActionCard eyebrow="Company role" title={accountTrustProfile.companyRole} detail="This role controls what you can do across the company rather than inside a single contract.">
        <div className="flex justify-end">
          <StatusBadge status="In progress" />
        </div>
      </ActionCard>

      <ActionCard eyebrow="Company permissions" title="Operational permissions">
        <div className="space-y-3">
          {permissionOptions.map((permission) => (
            <PermissionRow
              key={permission}
              label={permission}
              enabled={accountTrustProfile.companyPermissions.includes(permission)}
            />
          ))}
        </div>
      </ActionCard>

      <ActionCard eyebrow="Contract authority" title="Assigned separately within live contracts" detail="Even with company permissions, contract authority is still assigned package by package across approval and release flows." />

      <PrimaryCTA href="/account">Save permissions</PrimaryCTA>
    </MobileShell>
  );
}
