import type { AccountTrustProfile, CompanyRole } from "./trustSetupData";
import type { ActionFeedItem, WorkflowAuthority } from "./actionFeedData";
import type { ProjectRecord } from "./prototypeData";

export type DemoRole =
  | "funder"
  | "primary_contractor"
  | "subcontractor"
  | "qs"
  | "supplier";

export type DemoUser = {
  id: string;
  role: DemoRole;
  name: string;
  company: string;
  email: string;
  phone: string;
  roleLabel: string;
  workflowRole: string;
  companyRole: CompanyRole;
  assignedContractIds: string[];
  authority: WorkflowAuthority;
};

export const demoUsers: DemoUser[] = [
  {
    id: "contact-leah-mercer",
    role: "funder",
    name: "Leah Mercer",
    company: "Harbour Capital Treasury",
    email: "leah.mercer@harbourcapital.example",
    phone: "+44 7700 900321",
    roleLabel: "Funder / Treasury Controller",
    workflowRole: "treasury",
    companyRole: "Full admin",
    assignedContractIds: [],
    authority: "treasury",
  },
  {
    id: "contact-daniel-hart",
    role: "primary_contractor",
    name: "Daniel Hart",
    company: "Brent Cross Delivery Ltd",
    email: "daniel.hart@brentcrossdelivery.example",
    phone: "+44 20 7946 1210",
    roleLabel: "Primary Contractor",
    workflowRole: "commercial_approver",
    companyRole: "Sign-off only",
    assignedContractIds: ["contract-groundworks", "contract-electrical-first-fix", "contract-materials-supply", "contract-steel-frame"],
    authority: "client",
  },
  {
    id: "contact-lena-ward",
    role: "subcontractor",
    name: "Lena Ward",
    company: "Northline Structures Ltd",
    email: "lena.ward@northline.example",
    phone: "+44 20 7946 1107",
    roleLabel: "Subcontractor",
    workflowRole: "contractor",
    companyRole: "Limited admin",
    assignedContractIds: ["contract-steel-frame", "contract-electrical-first-fix"],
    authority: "contractor",
  },
  {
    id: "contact-owen-blake",
    role: "qs",
    name: "Owen Blake",
    company: "Aster QS Partners",
    email: "owen.blake@asterqs.example",
    phone: "+44 20 7946 1190",
    roleLabel: "Project Manager / QS",
    workflowRole: "qs",
    companyRole: "Sign-off only",
    assignedContractIds: [],
    authority: "qs",
  },
  {
    id: "contact-samira-khan",
    role: "supplier",
    name: "Samira Khan",
    company: "Atlas Materials Supply Co",
    email: "samira.khan@atlasmaterials.example",
    phone: "+44 161 555 0142",
    roleLabel: "Materials Supplier",
    workflowRole: "supplier",
    companyRole: "View only",
    assignedContractIds: ["contract-materials-supply"],
    authority: "contractor",
  },
];

export const defaultDemoUserId = "contact-leah-mercer";

export function getDemoUser(userId: string) {
  return demoUsers.find((user) => user.id === userId) ?? demoUsers[0];
}

export function canDemoUserSeeContract(user: DemoUser, contractId?: string) {
  if (user.role === "funder" || user.role === "qs" || user.role === "primary_contractor") return true;
  return Boolean(contractId && user.assignedContractIds.includes(contractId));
}

export function filterProjectsForDemoUser(projects: ProjectRecord[], user: DemoUser) {
  if (user.role === "funder" || user.role === "qs" || user.role === "primary_contractor") return projects;

  return projects
    .map((project) => ({
      ...project,
      contracts: project.contracts.filter((contract) => canDemoUserSeeContract(user, contract.id)),
    }))
    .filter((project) => project.contracts.length > 0);
}

export function canDemoUserSeeAction(item: ActionFeedItem, user: DemoUser) {
  if (!item.requiresAction || item.isResolved) return false;
  if (!canDemoUserSeeContract(user, item.contractId)) return false;
  if (user.role === "funder") return item.currentAuthority === "treasury" || item.fundingGap > 0 || item.releaseStatus !== "blocked";
  if (user.role === "qs") return item.currentAuthority === "qs" || item.statusType === "dispute" || (item.requiredApprovals.includes(user.id) && !item.completedApprovals.includes(user.id));
  if (user.role === "primary_contractor") return item.currentAuthority === "client" || item.currentAuthority === "contractor" || item.statusType === "dispute";
  return item.currentAuthority === "contractor" || item.submittedBy === user.name || item.contractContext.permissions[user.id] !== undefined;
}

export function filterActionsForDemoUser(items: ActionFeedItem[], user: DemoUser) {
  return items.filter((item) => canDemoUserSeeAction(item, user));
}

export function getAccountProfileForDemoUser(user: DemoUser): AccountTrustProfile {
  return {
    legalName: user.name,
    dateOfBirth: user.role === "funder" ? "14 Sep 1988" : "22 May 1986",
    mobileNumber: user.phone,
    countryOfResidence: "United Kingdom",
    documentType: "Passport",
    identityVerificationStatus: user.role === "supplier" ? "Pending" : "Verified",
    currentCompany: user.company,
    companyRole: user.companyRole,
    companyMemberships: [
      {
        id: `membership-${user.id}`,
        companyName: user.company,
        role: user.companyRole,
        status: user.role === "supplier" ? "In progress" : "Complete",
        context: user.roleLabel,
      },
      {
        id: "membership-project",
        companyName: "Brent Cross Phase 1",
        role: user.role === "funder" ? "Full admin" : "Sign-off only",
        status: "Complete",
        context: "Live project workflow access.",
      },
    ],
    companyPermissions: getPermissionsForDemoUser(user),
    setupSteps: [
      {
        id: "setup-identity",
        title: "Verify identity",
        detail: "Identity controls trusted approvals and funding actions.",
        status: user.role === "supplier" ? "Required" : "Complete",
        href: "/account/setup/kyc",
      },
      {
        id: "setup-company",
        title: "Join company",
        detail: "Company context controls which packages and payment actions are visible.",
        status: "Complete",
        href: "/account/company-membership",
      },
      {
        id: "setup-permissions",
        title: "Review permissions",
        detail: "Permissions must match the current workflow authority.",
        status: user.role === "funder" ? "Complete" : "Required",
        href: "/account/company-permissions",
      },
    ],
  };
}

function getPermissionsForDemoUser(user: DemoUser) {
  if (user.role === "funder") return ["Add funds", "Approve treasury release", "View funding gaps", "Reassign actions"];
  if (user.role === "qs") return ["Validate evidence", "Certify value", "Return evidence", "Raise dispute"];
  if (user.role === "primary_contractor") return ["Submit claims", "Approve claim", "Respond to issues", "View contract status"];
  if (user.role === "supplier") return ["Submit invoice", "Submit delivery note", "View supplier payment status"];
  return ["Submit evidence", "Resubmit evidence", "View assigned package status"];
}
