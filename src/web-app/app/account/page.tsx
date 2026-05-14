"use client";

import { useCallback, useMemo, useState } from "react";

import MobileShell from "../components/prototype/MobileShell";
import IdentityStatusBanner from "../components/prototype/IdentityStatusBanner";
import NotificationFilters, { type FilterScope } from "../components/prototype/NotificationFilters";
import NotificationSystemHeader from "../components/prototype/NotificationSystemHeader";
import { usePrototype } from "../components/PrototypeProvider";
import { deriveAccountWorkflowState, type UnifiedWorkflowControl, type WorkflowSurfaceState } from "@/lib/workflowState";
import { getAccountProfileForDemoUser } from "@/lib/demoUsers";

type AccountFilterId = "all" | "permissions" | "verification" | "alerts";

const accountScopes: readonly FilterScope<AccountFilterId>[] = [
  { id: "all", label: "All" },
  { id: "permissions", label: "Permissions" },
  { id: "verification", label: "Verification" },
  { id: "alerts", label: "Alerts" },
];

export default function AccountPage() {
  const { currentUser, actionFeedItems } = usePrototype();
  const accountTrustProfile = getAccountProfileForDemoUser(currentUser);
  const [selectedFilter, setSelectedFilter] = useState<AccountFilterId>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionNote, setActionNote] = useState<Record<string, string>>({});
  const [formValues, setFormValues] = useState({
    legalName: accountTrustProfile.legalName,
    preferredName: currentUser.name,
    businessName: accountTrustProfile.currentCompany,
    companyNumber: "",
    bankName: "",
    accountName: accountTrustProfile.currentCompany,
    sortCode: "",
    accountNumber: "",
    contactName: "",
    contactEmail: "",
    contactRole: "View only",
    communication: "Email and in-app",
    deleteConfirm: "",
  });

  const rows = useMemo<WorkflowSurfaceState[]>(
    () => {
      return [
        deriveAccountWorkflowState({
          id: "profile",
          title: "My details",
          dominantAction: "Profile details",
          nextAction: "Add or edit name and contact details",
          reason: "Your name, mobile, and contact details are used for invitations, approvals, audit notes, and payment authority checks.",
          requiredActor: "Account holder",
          status: "clear",
          detailRows: [
            ["Legal name", accountTrustProfile.legalName],
            ["Preferred name", currentUser.name],
            ["Email", currentUser.email],
            ["Mobile", accountTrustProfile.mobileNumber],
          ],
          primaryActions: [
            { key: "save_profile", label: "Save details", enabled: true, intent: "primary" },
          ],
          secondaryActions: [
            { key: "edit_email", label: "Edit email", enabled: true },
          ],
        }),
        deriveAccountWorkflowState({
          id: "identity",
          title: "ID verification",
          dominantAction: accountTrustProfile.identityVerificationStatus === "Verified" ? "Identity verified" : "Verify with ID",
          nextAction: accountTrustProfile.identityVerificationStatus === "Verified" ? "Review ID record" : "Upload identity document",
          reason: "Identity verification controls whether your approvals, funding actions, and business permissions can be trusted.",
          requiredActor: "Identity operations",
          status: accountTrustProfile.identityVerificationStatus === "Verified" ? "clear" : "blocked",
          detailRows: [
            ["Status", accountTrustProfile.identityVerificationStatus],
            ["Document", accountTrustProfile.documentType],
            ["Residence", accountTrustProfile.countryOfResidence],
            ["Date of birth", accountTrustProfile.dateOfBirth],
          ],
          primaryActions: [
            { key: "verify_id", label: accountTrustProfile.identityVerificationStatus === "Verified" ? "Review ID" : "Verify ID", enabled: true, intent: "primary" },
          ],
          secondaryActions: [
            { key: "replace_document", label: "Replace document", enabled: true },
          ],
        }),
        deriveAccountWorkflowState({
          id: "business",
          title: "Business",
          dominantAction: "Business linked",
          nextAction: "Add, link, or verify a business",
          reason: "Business verification links you to the company that owns projects, contracts, payment authority, and supplier invitations.",
          requiredActor: "Company admin",
          status: accountTrustProfile.companyMemberships.some((membership) => membership.status === "Complete") ? "clear" : "pending",
          detailRows: accountTrustProfile.companyMemberships.map((membership) => [membership.companyName, `${membership.role} • ${membership.status} • ${membership.context}`]),
          primaryActions: [
            { key: "link_business", label: "Link business", enabled: true, intent: "primary" },
          ],
          secondaryActions: [
            { key: "verify_business", label: "Verify business", enabled: true },
          ],
        }),
        deriveAccountWorkflowState({
          id: "bank",
          title: "Bank account",
          dominantAction: currentUser.role === "funder" ? "Bank required for funding" : "Payment bank details",
          nextAction: "Add or verify bank account",
          reason: "Bank details support project funding, supplier payments, refunds, and release audit checks.",
          requiredActor: currentUser.role === "funder" ? "Treasury controller" : "Account holder",
          status: currentUser.role === "funder" ? "pending" : "clear",
          detailRows: [
            ["Account name", accountTrustProfile.currentCompany],
            ["Bank verification", currentUser.role === "funder" ? "Required before live deposits" : "Optional until payment setup"],
            ["Use", currentUser.role === "funder" ? "Add funds and release payments" : "Receive approved payments"],
          ],
          primaryActions: [
            { key: "add_bank", label: "Add bank", enabled: true, intent: "primary" },
          ],
          secondaryActions: [
            { key: "verify_bank", label: "Verify bank", enabled: true },
          ],
        }),
        deriveAccountWorkflowState({
          id: "contacts",
          title: "Contacts & permissions",
          dominantAction: "Manage access",
          nextAction: "Add contact and set permissions",
          reason: "Contacts can be invited into a business, project, or contract with role-specific permissions.",
          requiredActor: "Company admin",
          status: currentUser.companyRole === "View only" ? "pending" : "clear",
          detailRows: [
            ...accountTrustProfile.companyPermissions.map((permission) => [permission, authorityLabel(permission)] as [string, string]),
            ["Current role", currentUser.companyRole],
          ],
          primaryActions: [
            { key: "add_contact", label: "Add contact", enabled: currentUser.companyRole !== "View only", intent: "primary" },
          ],
          secondaryActions: [
            { key: "edit_permissions", label: "Edit permissions", enabled: currentUser.companyRole !== "View only" },
          ],
        }),
        deriveAccountWorkflowState({
          id: "preferences",
          title: "Communication",
          dominantAction: "Preferences active",
          nextAction: "Edit communication preferences",
          reason: "Choose how you receive action alerts, payment updates, project invites, and policy messages.",
          requiredActor: "Account holder",
          status: "clear",
          detailRows: [
            ["Action alerts", "Email and in-app"],
            ["Payment updates", "In-app"],
            ["Marketing", "Off"],
          ],
          primaryActions: [
            { key: "save_preferences", label: "Save preferences", enabled: true, intent: "primary" },
          ],
          secondaryActions: [
            { key: "test_notification", label: "Send test", enabled: true },
          ],
        }),
        deriveAccountWorkflowState({
          id: "legal",
          title: "Legal & support",
          dominantAction: "Policies and support",
          nextAction: "View terms, privacy, or contact support",
          reason: "Terms, privacy policy, and support contact options should be easy to find from account settings.",
          requiredActor: "Account holder",
          status: "clear",
          detailRows: [
            ["Terms and conditions", "Current"],
            ["Privacy policy", "Current"],
            ["Support", "Get in contact"],
          ],
          primaryActions: [
            { key: "contact_support", label: "Get in contact", enabled: true, intent: "primary" },
          ],
          secondaryActions: [
            { key: "view_terms", label: "Terms", enabled: true },
            { key: "view_privacy", label: "Privacy", enabled: true },
          ],
        }),
        deriveAccountWorkflowState({
          id: "delete",
          title: "Delete account",
          dominantAction: "Restricted action",
          nextAction: "Request account deletion",
          reason: "Deleting an account is restricted while live projects, contracts, payments, or audit obligations are attached.",
          requiredActor: "Account holder and support",
          status: "blocked",
          detailRows: [
            ["Live obligations", actionFeedItems.length ? `${actionFeedItems.length} workflow items visible` : "None visible"],
            ["Audit records", "Retained where legally required"],
          ],
          primaryActions: [
            { key: "request_delete", label: "Request deletion", enabled: true, intent: "danger" },
          ],
          secondaryActions: [
            { key: "export_data", label: "Export data", enabled: true },
          ],
        }),
      ];
    },
    [accountTrustProfile, actionFeedItems.length, currentUser],
  );
  const visibleRows = useMemo(
    () =>
      rows.filter((row) => {
        if (selectedFilter === "permissions" && row.id !== "permissions" && row.id !== "company") return false;
        if (selectedFilter === "verification" && row.id !== "identity" && row.id !== "setup") return false;
        if (selectedFilter === "alerts" && normalizeAccountValue(row) !== "Required" && normalizeAccountValue(row) !== "Restricted") return false;
        if (!searchQuery.trim()) return true;
        const haystack = [
          row.title,
          row.dominantAction,
          row.nextAction,
          row.requiredActor,
          ...row.detailRows.flat(),
        ].join(" ").toLowerCase();
        return haystack.includes(searchQuery.trim().toLowerCase());
      }),
    [rows, searchQuery, selectedFilter],
  );
  const counts = useMemo(
    () => ({
      all: rows.length,
      permissions: rows.filter((row) => row.id === "permissions" || row.id === "company").length,
      verification: rows.filter((row) => row.id === "identity" || row.id === "setup").length,
      alerts: rows.filter((row) => normalizeAccountValue(row) === "Required" || normalizeAccountValue(row) === "Restricted").length,
    }),
    [rows],
  );

  const toggle = useCallback((id: string) => {
    setExpandedId((current) => (current === id ? null : id));
  }, []);

  const markAction = useCallback((id: string, label: string) => {
    setActionNote((current) => ({
      ...current,
      [id]: `${label} queued inline for account workflow review.`,
    }));
  }, []);

  return (
    <MobileShell title="" headerContent={<NotificationSystemHeader />}>
      <div className="-mx-5 rounded-t-[30px] bg-[#F7F8FA] px-5 pb-6 pt-2 text-[#0B0F1A]">
        <NotificationFilters
          title="Account"
          accent="purple"
          selected={selectedFilter}
          query={searchQuery}
          counts={counts}
          scopes={accountScopes}
          placeholder="Search account, permissions, setup"
          onQueryChange={setSearchQuery}
          onSelect={setSelectedFilter}
        />

      <div className="mt-3 space-y-3">
      <IdentityStatusBanner
        status={accountTrustProfile.identityVerificationStatus}
        detail="Identity and company authority control which live contract and funding actions are available."
      />

      <section className="w-full min-w-0 overflow-hidden rounded-[22px] border border-[#E6E8EC] bg-white">
        {visibleRows.map((row) => {
          const expanded = expandedId === row.id;

          return (
            <article key={row.id} className="w-full min-w-0 overflow-hidden border-b border-[#E6E8EC] last:border-b-0">
              <button
                type="button"
                onClick={() => toggle(row.id)}
                className="flex h-[108px] w-full min-w-0 items-stretch gap-3 overflow-hidden bg-white px-3.5 py-4 text-left active:bg-[#F8FAFC]"
                aria-expanded={expanded}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#EAF0FF] text-sm font-semibold text-[#102345]">
                  {initials(row.title)}
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-center overflow-hidden">
                  <p className="truncate whitespace-nowrap text-sm font-semibold leading-5 text-[#0B0F1A]" title={row.title}>{row.title}</p>
                  <p className="mt-1 truncate whitespace-nowrap text-[13px] font-medium leading-5 text-[#0B0F1A]" title={row.dominantAction}>{row.dominantAction}</p>
                  <p className={`mt-1 h-4 truncate whitespace-nowrap text-xs font-medium leading-4 ${row.status === "blocked" ? "text-[#B42318]" : "text-[#667085]"}`} title={row.nextAction}>{row.nextAction}</p>
                </div>
                <div className="flex w-[92px] min-w-[92px] max-w-[92px] shrink-0 items-center justify-end overflow-hidden text-right">
                  <p className={`max-w-full whitespace-nowrap text-[13px] font-bold leading-5 ${accountValueClass(normalizeAccountValue(row))}`}>
                    {normalizeAccountValue(row)}
                  </p>
                </div>
              </button>

              {expanded ? (
                <div className="min-w-0 overflow-hidden border-t border-[#D7DBE2] bg-[#FBFBFC] px-3.5 pb-4">
                  <section className="border-b border-[#E6E8EC] py-4">
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6D5BD0]">{contextLabel(row)}</p>
                    <p className="text-sm font-semibold text-[#0B0F1A]">{row.dominantAction}</p>
                    <p className="mt-2 break-words text-sm leading-6 text-[#4B5565]">{row.reason}</p>
                    <p className="mt-2 break-words text-xs font-medium text-[#667085]">Required actor: {row.requiredActor}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-semibold text-[#102345]">
                      {[...row.primaryActions, ...row.secondaryActions].map((action) => (
                        <WorkflowActionButton key={action.key} action={action} onPress={() => markAction(row.id, action.label)} />
                      ))}
                    </div>
                    {actionNote[row.id] ? <p className="mt-3 break-words text-xs text-[#667085]">{actionNote[row.id]}</p> : null}
                  </section>

                  <section className="space-y-1.5 border-b border-[#E6E8EC] py-4 text-xs text-[#667085]">
                    {dividerRow("Next step", row.nextAction)}
                    {row.detailRows.map(([label, value]) => dividerRow(label, value))}
                  </section>
                  <AccountInlineControls
                    rowId={row.id}
                    values={formValues}
                    onChange={(key, value) => setFormValues((current) => ({ ...current, [key]: value }))}
                    onConfirm={(message) => setActionNote((current) => ({ ...current, [row.id]: message }))}
                  />
                </div>
              ) : null}
            </article>
          );
        })}
      </section>
      </div>
      </div>
    </MobileShell>
  );
}

function dividerRow(label: string, value: string) {
  return (
    <div key={label} className="flex min-w-0 items-center justify-between gap-3 overflow-hidden">
      <span className="shrink-0 truncate whitespace-nowrap">{label}</span>
      <span className="min-w-0 truncate text-right font-medium text-[#0B0F1A]" title={value}>{value || "—"}</span>
    </div>
  );
}

type AccountFormValues = {
  legalName: string;
  preferredName: string;
  businessName: string;
  companyNumber: string;
  bankName: string;
  accountName: string;
  sortCode: string;
  accountNumber: string;
  contactName: string;
  contactEmail: string;
  contactRole: string;
  communication: string;
  deleteConfirm: string;
};

function AccountInlineControls({
  rowId,
  values,
  onChange,
  onConfirm,
}: {
  rowId: string;
  values: AccountFormValues;
  onChange: (key: keyof AccountFormValues, value: string) => void;
  onConfirm: (message: string) => void;
}) {
  if (rowId === "profile") {
    return (
      <section className="grid gap-2 py-4 text-sm">
        <input value={values.legalName} onChange={(event) => onChange("legalName", event.target.value)} placeholder="Legal name" className={inputClassName} />
        <input value={values.preferredName} onChange={(event) => onChange("preferredName", event.target.value)} placeholder="Preferred name" className={inputClassName} />
        <button type="button" onClick={() => onConfirm("Profile details saved for demo review.")} className={primaryButtonClassName}>Save details</button>
      </section>
    );
  }

  if (rowId === "identity") {
    return (
      <section className="grid gap-2 py-4 text-sm">
        <select className={inputClassName} defaultValue="Passport">
          <option>Passport</option>
          <option>Driving licence</option>
          <option>National identity card</option>
        </select>
        <button type="button" onClick={() => onConfirm("ID verification opened. Document upload would start here.")} className={primaryButtonClassName}>Verify with ID</button>
      </section>
    );
  }

  if (rowId === "business") {
    return (
      <section className="grid gap-2 py-4 text-sm">
        <input value={values.businessName} onChange={(event) => onChange("businessName", event.target.value)} placeholder="Business name" className={inputClassName} />
        <input value={values.companyNumber} onChange={(event) => onChange("companyNumber", event.target.value)} placeholder="Company number" className={inputClassName} />
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => onConfirm("Business linked to account in demo state.")} className={primaryButtonClassName}>Link business</button>
          <button type="button" onClick={() => onConfirm("Business verification request queued.")} className={secondaryButtonClassName}>Verify business</button>
        </div>
      </section>
    );
  }

  if (rowId === "bank") {
    return (
      <section className="grid gap-2 py-4 text-sm">
        <input value={values.bankName} onChange={(event) => onChange("bankName", event.target.value)} placeholder="Bank name" className={inputClassName} />
        <input value={values.accountName} onChange={(event) => onChange("accountName", event.target.value)} placeholder="Account name" className={inputClassName} />
        <div className="grid grid-cols-2 gap-2">
          <input value={values.sortCode} onChange={(event) => onChange("sortCode", event.target.value)} placeholder="Sort code" className={inputClassName} />
          <input value={values.accountNumber} onChange={(event) => onChange("accountNumber", event.target.value)} placeholder="Account number" className={inputClassName} />
        </div>
        <button type="button" onClick={() => onConfirm("Bank account added. Verification would run before live payments.")} className={primaryButtonClassName}>Add bank</button>
      </section>
    );
  }

  if (rowId === "contacts") {
    return (
      <section className="grid gap-2 py-4 text-sm">
        <input value={values.contactName} onChange={(event) => onChange("contactName", event.target.value)} placeholder="Contact name" className={inputClassName} />
        <input value={values.contactEmail} onChange={(event) => onChange("contactEmail", event.target.value)} placeholder="Email" className={inputClassName} />
        <select value={values.contactRole} onChange={(event) => onChange("contactRole", event.target.value)} className={inputClassName}>
          <option>View only</option>
          <option>Sign-off only</option>
          <option>Payment authority</option>
          <option>Full admin</option>
        </select>
        <button type="button" onClick={() => onConfirm("Contact invitation and permissions queued.")} className={primaryButtonClassName}>Add contact</button>
      </section>
    );
  }

  if (rowId === "preferences") {
    return (
      <section className="grid gap-2 py-4 text-sm">
        <select value={values.communication} onChange={(event) => onChange("communication", event.target.value)} className={inputClassName}>
          <option>Email and in-app</option>
          <option>In-app only</option>
          <option>Email only</option>
          <option>Critical alerts only</option>
        </select>
        <button type="button" onClick={() => onConfirm("Communication preferences saved.")} className={primaryButtonClassName}>Save preferences</button>
      </section>
    );
  }

  if (rowId === "legal") {
    return (
      <section className="flex flex-wrap gap-2 py-4 text-xs font-semibold">
        <button type="button" onClick={() => onConfirm("Terms and conditions opened inline for demo.")} className={secondaryButtonClassName}>Terms and conditions</button>
        <button type="button" onClick={() => onConfirm("Privacy policy opened inline for demo.")} className={secondaryButtonClassName}>Privacy policy</button>
        <button type="button" onClick={() => onConfirm("Support contact form opened.")} className={primaryButtonClassName}>Get in contact</button>
      </section>
    );
  }

  if (rowId === "delete") {
    return (
      <section className="grid gap-2 py-4 text-sm">
        <input value={values.deleteConfirm} onChange={(event) => onChange("deleteConfirm", event.target.value)} placeholder="Type DELETE to request deletion" className={inputClassName} />
        <button
          type="button"
          disabled={values.deleteConfirm !== "DELETE"}
          onClick={() => onConfirm("Account deletion request queued for support review.")}
          className="justify-self-start rounded-full border border-[#FECACA] bg-[#FEF2F2] px-3 py-1.5 text-xs font-semibold text-[#B42318] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Request deletion
        </button>
      </section>
    );
  }

  return null;
}

const inputClassName = "rounded-xl border border-[#D7DBE2] bg-white px-3 py-2 outline-none";
const primaryButtonClassName = "justify-self-start rounded-full border border-[#102345] bg-[#102345] px-3 py-1.5 text-xs font-semibold text-white";
const secondaryButtonClassName = "rounded-full border border-[#D7DBE2] bg-white px-3 py-1.5 text-xs font-semibold text-[#102345]";

function authorityLabel(permission: string) {
  if (permission.includes("fund")) return "Treasury release authority";
  if (permission.includes("contracts")) return "Contract workflow authority";
  if (permission.includes("sign-off")) return "Approval authority";
  return "Company administration";
}

function contextLabel(row: WorkflowSurfaceState) {
  if (row.id === "identity" || row.id === "setup") return row.status === "clear" ? "Verification complete" : "Verification required";
  if (row.id === "permissions") return "Authority task";
  if (/dispute/i.test(row.dominantAction)) return "Dispute case";
  if (/approval/i.test(row.dominantAction)) return "Approval task";
  if (/funding/i.test(row.dominantAction)) return "Funding issue";
  return "Account authority";
}

function normalizeAccountValue(row: WorkflowSurfaceState): "Required" | "Complete" | "Limited" | "Restricted" | "Active" {
  if (row.id === "identity" && row.status === "clear") return "Complete";
  if (row.id === "identity") return "Required";
  if (row.status === "blocked") return "Restricted";
  if (row.id === "permissions") return row.status === "clear" ? "Active" : "Limited";
  if (row.id === "setup") return row.status === "clear" ? "Complete" : "Required";
  return row.status === "clear" ? "Active" : "Limited";
}

function accountValueClass(value: ReturnType<typeof normalizeAccountValue>) {
  if (value === "Complete" || value === "Active") return "text-[#047857]";
  if (value === "Restricted") return "text-[#EF4444]";
  return "text-[#B45309]";
}

function initials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "SF";
}

function WorkflowActionButton({
  action,
  onPress,
}: {
  action: UnifiedWorkflowControl;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      disabled={!action.enabled}
      onClick={onPress}
      className={`rounded-full border px-3 py-1.5 transition disabled:cursor-not-allowed disabled:opacity-40 ${
        action.intent === "primary"
          ? "border-[#102345] bg-[#102345] text-white hover:bg-[#1D4ED8] hover:border-[#1D4ED8]"
          : action.intent === "danger"
            ? "border-[#FECACA] bg-[#FEF2F2] text-[#B42318] hover:border-[#FCA5A5]"
            : "border-[#D7DBE2] bg-white text-[#102345] hover:border-[#A8B3C7] hover:text-[#1D4ED8]"
      }`}
    >
      {action.label}
    </button>
  );
}
