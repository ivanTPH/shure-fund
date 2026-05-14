"use client";

import type { ReactNode } from "react";

import type { Contact } from "@/lib/contactIdentity";

import { useContactIdentityPanel } from "../PrototypeProvider";

export default function ClickableAvatar({
  contact,
  children,
  className = "",
}: {
  contact?: Contact | null;
  children: ReactNode;
  className?: string;
}) {
  const { openContactPanel } = useContactIdentityPanel();
  const safeContact = contact ?? {
    id: "contact-unknown",
    name: "Unknown contact",
    role: "contact",
    organisation: "Organisation pending",
  };

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={(event) => {
        event.stopPropagation();
        openContactPanel(safeContact);
      }}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        event.stopPropagation();
        openContactPanel(safeContact);
      }}
      className={className}
      aria-label={`Open contact details for ${safeContact.name}`}
    >
      {children}
    </span>
  );
}
