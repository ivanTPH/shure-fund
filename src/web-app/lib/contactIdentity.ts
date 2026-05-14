import type { ActionFeedContractContext, ActionFeedItem } from "./actionFeedData";

export type Contact = {
  id: string;
  name: string;
  role: "contractor" | "qs" | "funder" | string;
  organisation: string;
  companyRoleTitle?: string;
  projectRole?: string;
  projectPermission?: string;
  authorityTags?: string[];
  workflowContext?: string;
  email?: string;
  phone?: string;
  description?: string;
  about?: string;
  avatarInitials?: string;
  contractContext?: ActionFeedContractContext;
};

export type WorkflowAuthorityAction =
  | "submit_evidence"
  | "certify"
  | "approve"
  | "release"
  | "dispute"
  | "escalate"
  | "reassign";

const contacts: Contact[] = [
  {
    id: "contact-daniel-hart",
    name: "Daniel Hart",
    role: "qs",
    organisation: "Brent Cross Delivery Ltd",
    companyRoleTitle: "Primary contractor approval",
    projectPermission: "Approve claim / Respond to issues",
    email: "daniel.hart@brentcrossdelivery.example",
    phone: "+44 20 7946 1210",
    about: "Primary contractor lead managing project delivery, claim approvals, and issue response.",
  },
  {
    id: "contact-lena-ward",
    name: "Lena Ward",
    role: "contractor",
    organisation: "Northline Structures Ltd",
    companyRoleTitle: "Subcontractor",
    projectPermission: "Submit and resubmit package evidence",
    email: "lena.ward@northline.example",
    phone: "+44 20 7946 1107",
    about: "Subcontractor package owner submitting evidence for steel and electrical work packages.",
  },
  {
    id: "contact-samira-khan",
    name: "Samira Khan",
    role: "contractor",
    organisation: "Atlas Materials Supply Co",
    companyRoleTitle: "Materials supplier",
    projectPermission: "Submit invoice / Delivery evidence",
    email: "samira.khan@atlasmaterials.example",
    phone: "+44 161 555 0142",
    about: "Supplier contact for materials invoices, delivery notes, and payment status.",
  },
  {
    id: "contact-liam-price",
    name: "Liam Price",
    role: "contractor",
    organisation: "Northline Structures Ltd",
    companyRoleTitle: "Contractor",
    projectPermission: "Submit evidence / Respond to dispute",
    email: "liam.price@northline.example",
    phone: "+44 20 7946 1101",
    about: "Site manager coordinating package delivery, progress evidence, and completion submissions.",
  },
  {
    id: "contact-martha-webb",
    name: "Martha Webb",
    role: "qs",
    organisation: "Northline Structures Ltd",
    companyRoleTitle: "Quantity surveyor",
    projectPermission: "Certify stage / Raise dispute note",
    email: "martha.webb@northline.example",
    phone: "+44 20 7946 1102",
    about: "Commercial manager responsible for package review, certificates, and supplier-side assessment.",
  },
  {
    id: "contact-ava-singh",
    name: "Ava Singh",
    role: "contractor",
    organisation: "WeatherSeal Roofing Ltd",
    companyRoleTitle: "Contractor",
    projectPermission: "Submit evidence / Respond to review",
    email: "ava.singh@weatherseal.example",
    phone: "+44 161 555 0104",
    about: "Package manager handling roofing progress, notes, and evidence uploads.",
  },
  {
    id: "contact-nadia-cole",
    name: "Nadia Cole",
    role: "contractor",
    organisation: "Prime Building Services",
    companyRoleTitle: "Contractor",
    projectPermission: "Submit completion records / Respond to comments",
    email: "nadia.cole@primebuilding.example",
    phone: "+44 121 555 0187",
    about: "Commissioning lead for final records, handover readiness, and evidence submission.",
  },
  {
    id: "contact-oliver-reed",
    name: "Oliver Reed",
    role: "contractor",
    organisation: "Skyline Envelope Ltd",
    companyRoleTitle: "Contractor",
    projectPermission: "Submit release pack / Upload evidence",
    email: "oliver.reed@skyline.example",
    phone: "+44 20 7946 1155",
    about: "Project lead overseeing close-out documents and release pack submissions.",
  },
  {
    id: "contact-george-millar",
    name: "George Millar",
    role: "contractor",
    organisation: "Northwest Civils LLP",
    companyRoleTitle: "Contractor",
    projectPermission: "Respond to dispute / Submit evidence",
    email: "george.millar@northwestcivils.example",
    phone: "+44 161 555 0192",
    about: "Commercial lead responding to held value, variations, and dispute-related evidence.",
  },
  {
    id: "contact-owen-blake",
    name: "Owen Blake",
    role: "qs",
    organisation: "Professional Assurance Services",
    companyRoleTitle: "Professional assurance",
    projectPermission: "Certify stage / Request clarification",
    email: "owen.blake@assurance.example",
    phone: "+44 20 7946 1190",
    about: "Professional reviewer responsible for technical assurance and sign-off readiness.",
  },
  {
    id: "contact-maya-singh",
    name: "Maya Singh",
    role: "qs",
    organisation: "Harbour Capital",
    companyRoleTitle: "Commercial approval",
    projectPermission: "Review package / Hold value",
    email: "maya.singh@harbourcapital.example",
    phone: "+44 20 7946 1184",
    about: "Commercial approver for contract readiness, held value decisions, and exception escalation.",
  },
  {
    id: "contact-leah-mercer",
    name: "Leah Mercer",
    role: "funder",
    organisation: "Harbour Capital",
    companyRoleTitle: "Funder",
    projectPermission: "Resolve dispute / Release decision",
    email: "leah.mercer@harbourcapital.example",
    phone: "+44 7700 900321",
    about: "Funder-side user with release visibility, dispute resolution authority, and company access controls.",
  },
];

function normaliseRole(role?: string) {
  const value = role?.toLowerCase() ?? "";
  if (value.includes("funder") || value.includes("treasury")) return "funder";
  if (value.includes("qs") || value.includes("quantity surveyor") || value.includes("commercial") || value.includes("reviewer") || value.includes("assurance")) return "qs";
  return "contractor";
}

export function normaliseWorkflowRole(role?: string) {
  const value = role?.toLowerCase().replace(/[\s-]+/g, "_") ?? "";
  if (!value) return "";
  if (value.includes("administrator") || value === "admin") return "administrator";
  if (value.includes("treasury")) return "treasury";
  if (value.includes("funder") || value.includes("release")) return "funder";
  if (value.includes("commercial") || value.includes("approver") || value.includes("approval")) return "commercial_approver";
  if (value.includes("client")) return "client";
  if (value.includes("certifier") || value.includes("quantity") || value.includes("qs") || value.includes("assurance")) return "qs";
  if (value.includes("supplier") || value.includes("submitter")) return "submitter";
  if (value.includes("contractor")) return "contractor";
  return value;
}

export function hasWorkflowAuthority(params: {
  userRole?: string;
  actionType: WorkflowAuthorityAction;
}) {
  const { actionType } = params;
  const userRole = normaliseWorkflowRole(params.userRole);

  if (!userRole) return false;

  switch (actionType) {
    case "submit_evidence":
      return ["contractor", "supplier", "submitter"].includes(userRole);
    case "certify":
      return ["qs", "certifier", "administrator"].includes(userRole);
    case "approve":
      return ["client", "approver", "commercial_approver", "administrator"].includes(userRole);
    case "release":
      return ["treasury", "funder", "administrator"].includes(userRole);
    case "dispute":
      return ["qs", "contractor", "client", "administrator"].includes(userRole);
    case "escalate":
    case "reassign":
      return ["administrator", "client", "treasury"].includes(userRole);
    default:
      return false;
  }
}

export function getContactIdentity(contactId: string, contract?: ActionFeedContractContext): Contact {
  const matched = contacts.find((contact) => contact.id === contactId);
  const contractContact = contract?.contacts?.[contactId];
  const name = contractContact?.name ?? matched?.name ?? formatId(contactId);
  const roleLabel = contract?.permissions?.[contactId] ?? matched?.companyRoleTitle ?? formatRole(matched?.role ?? "contractor");
  const role = normaliseRole(roleLabel || matched?.role);
  const projectRole = contract?.permissions?.[contactId] ?? roleLabel;

  return {
    id: contactId,
    name,
    role,
    organisation: contractContact?.organisation ?? matched?.organisation ?? "Organisation pending",
    companyRoleTitle: projectRole,
    projectRole,
    projectPermission: contract?.permissions?.[contactId] ?? matched?.projectPermission,
    authorityTags: getAuthorityTags(projectRole, role),
    email: contractContact?.email ?? matched?.email,
    phone: contractContact?.phone ?? matched?.phone,
    about: contractContact?.about ?? matched?.about ?? matched?.description,
    description: contractContact?.about ?? matched?.about ?? matched?.description,
    avatarInitials: getInitials(name),
    contractContext: contract,
  };
}

export function mapUserToContact(
  name?: string,
  role?: string,
  organisation?: string,
  context?: {
    projectId?: string;
    contractId?: string;
    companyRoleTitle?: string;
    projectPermission?: string;
    contract?: ActionFeedContractContext;
  },
): Contact {
  const trimmed = name?.trim();
  const contractMatch = Object.entries(context?.contract?.contacts ?? {}).find(([, contact]) => contact.name.toLowerCase() === trimmed?.toLowerCase());
  if (contractMatch) {
    return getContactIdentity(contractMatch[0], context?.contract);
  }

  const matched = contacts.find((contact) => contact.name.toLowerCase() === trimmed?.toLowerCase());
  if (matched) {
    const resolved = getContactIdentity(matched.id, context?.contract);
    return {
      ...resolved,
      companyRoleTitle: context?.companyRoleTitle ?? resolved.companyRoleTitle,
      projectPermission: context?.projectPermission ?? resolved.projectPermission,
      contractContext: context?.contract ?? resolved.contractContext,
    };
  }

  const fallbackRole = normaliseRole(role);
  const fallbackName = trimmed || "Unknown contact";
  const fallbackProjectRole = context?.companyRoleTitle ?? formatRole(fallbackRole);
  return {
    id: `contact-${fallbackName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    name: fallbackName,
    role: fallbackRole,
    organisation: organisation || "Organisation pending",
    companyRoleTitle: fallbackProjectRole,
    projectRole: fallbackProjectRole,
    projectPermission: context?.projectPermission ?? inferProjectPermission(fallbackRole, context?.projectId, context?.contractId),
    authorityTags: getAuthorityTags(fallbackProjectRole, fallbackRole),
    about: "Contact details are pending for this workflow participant.",
    description: "Contact details are pending for this workflow participant.",
    avatarInitials: getInitials(fallbackName),
    contractContext: context?.contract,
  };
}

function getAuthorityTags(projectRole?: string, role?: string) {
  const value = `${projectRole ?? ""} ${role ?? ""}`.toLowerCase();
  const tags: string[] = [];
  if (value.includes("quantity") || value.includes("qs") || value.includes("assurance")) tags.push("QS certification");
  if (value.includes("contractor")) tags.push("Contractor response authority");
  if (value.includes("commercial") || value.includes("approver")) tags.push("Commercial approval authority");
  if (value.includes("treasury") || value.includes("funder") || value.includes("release")) tags.push("Treasury release authority");
  if (value.includes("client")) tags.push("Client review authority");
  return tags.length > 0 ? Array.from(new Set(tags)) : ["Project Contact"];
}

export function getContactInitials(contact: Contact) {
  return contact.avatarInitials ?? getInitials(contact.name);
}

export function deriveContactWorkflowContext(contactId: string, item?: ActionFeedItem) {
  if (!item) return undefined;
  const permission = item.contractContext.permissions[contactId]?.toLowerCase() ?? "";
  const isCurrentOwner = item.reassignment?.currentOwnerId === contactId;
  const isCurrentAuthority =
    (item.currentAuthority === "qs" && (permission.includes("quantity") || permission.includes("qs") || permission.includes("assurance"))) ||
    (item.currentAuthority === "contractor" && permission.includes("contractor")) ||
    (item.currentAuthority === "client" && (permission.includes("client") || permission.includes("commercial"))) ||
    (item.currentAuthority === "treasury" && permission.includes("treasury"));

  if (isCurrentOwner) return "Current assigned owner for this notification";
  if (item.dispute.isActive && item.currentAuthority === "qs" && isCurrentAuthority) return "Lead QS reviewer on current disputed package";
  if (item.dispute.isActive && item.currentAuthority === "contractor" && isCurrentAuthority) return "Current contractor response owner";
  if (item.currentAuthority === "client" && isCurrentAuthority) return "Next commercial approver in chain";
  if (item.currentAuthority === "treasury" && isCurrentAuthority) return "Treasury authority for release on this item";
  if (permission.includes("contractor")) return "Contractor participant on this package";
  if (permission.includes("quantity") || permission.includes("qs") || permission.includes("assurance")) return "QS certification participant on this package";
  if (permission.includes("client") || permission.includes("commercial")) return "Commercial review participant on this package";
  if (permission.includes("treasury")) return "Treasury release participant on this package";
  return undefined;
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function inferProjectPermission(role: string, projectId?: string, contractId?: string) {
  const key = `${projectId ?? ""}:${contractId ?? ""}:${role}`;
  const explicit: Record<string, string> = {
    "project-salford-quays:contract-groundworks:contractor": "Respond to dispute / Submit drainage evidence",
    "project-salford-quays:contract-groundworks:qs": "Certify stage / Raise dispute note",
    "project-brent-cross:contract-steel-frame:qs": "Professional assurance / Confirm sign-off",
    "project-brent-cross:contract-roofing:contractor": "Upload evidence / Respond to review",
  };
  if (explicit[key]) return explicit[key];

  if (role === "funder") return "Resolve dispute / Release decision";
  if (role === "qs") return "Certify stage / Request clarification";
  return "Submit evidence / Respond to dispute";
}

function formatRole(role: string) {
  if (role === "qs") return "Quantity surveyor";
  if (role === "funder") return "Funder";
  if (role === "contractor") return "Contractor";
  return role;
}

function formatId(value: string) {
  return value
    .replace(/^contact-/, "")
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
