export type SetupStatus = "Required" | "In progress" | "Complete";
export type IdentityVerificationStatus = "Pending" | "Verified" | "Retry required";
export type CompanyRole = "Full admin" | "Limited admin" | "Sign-off only" | "View only";

export type CompanyMembership = {
  id: string;
  companyName: string;
  role: CompanyRole;
  status: SetupStatus;
  context: string;
};

export type AccountSetupStep = {
  id: string;
  title: string;
  detail: string;
  status: SetupStatus;
  href: string;
};

export type AccountTrustProfile = {
  legalName: string;
  dateOfBirth: string;
  mobileNumber: string;
  countryOfResidence: string;
  documentType: "Passport" | "Driving licence";
  identityVerificationStatus: IdentityVerificationStatus;
  currentCompany: string;
  companyRole: CompanyRole;
  companyMemberships: CompanyMembership[];
  companyPermissions: string[];
  setupSteps: AccountSetupStep[];
};

export const accountTrustProfile: AccountTrustProfile = {
  legalName: "Leah Mercer",
  dateOfBirth: "14 Sep 1988",
  mobileNumber: "+44 7700 900321",
  countryOfResidence: "United Kingdom",
  documentType: "Passport",
  identityVerificationStatus: "Pending",
  currentCompany: "Harbour Capital",
  companyRole: "Limited admin",
  companyMemberships: [
    {
      id: "membership-harbour",
      companyName: "Harbour Capital",
      role: "Limited admin",
      status: "In progress",
      context: "Current working company for funded release controls.",
    },
    {
      id: "membership-brent",
      companyName: "Brent Cross Delivery LLP",
      role: "Sign-off only",
      status: "Complete",
      context: "Authority limited to live contract approvals.",
    },
    {
      id: "membership-salford",
      companyName: "Salford Plot A SPV",
      role: "View only",
      status: "Complete",
      context: "Read-only project visibility for dispute monitoring.",
    },
  ],
  companyPermissions: [
    "Add users",
    "Edit company",
    "Add projects",
    "Add contracts",
    "Add funds",
    "Assign sign-off authority",
  ],
  setupSteps: [
    {
      id: "setup-identity",
      title: "Verify identity",
      detail: "Confirm legal identity once so approvals and funding actions can be trusted across companies.",
      status: "In progress",
      href: "/account/setup/kyc",
    },
    {
      id: "setup-company",
      title: "Join or create company",
      detail: "Choose the company context you are acting for before taking live workflow actions.",
      status: "Complete",
      href: "/account/company-membership",
    },
    {
      id: "setup-permissions",
      title: "Review permissions",
      detail: "Check the company permissions that control users, projects, contracts, and payment release.",
      status: "Required",
      href: "/account/company-permissions",
    },
  ],
};
