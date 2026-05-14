"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import RoleSwitcher from "./RoleSwitcher";

export default function AppChromeHeader({
  backHref,
  showAccountLabel = false,
}: {
  backHref?: string;
  showAccountLabel?: boolean;
}) {
  const router = useRouter();
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    setCanGoBack(window.history.length > 1);
  }, []);

  return (
    <div className="border-b border-[#E5E7EB] bg-white px-4 py-3 text-[#0B0F1A]">
      <div className="grid grid-cols-[56px_1fr_56px] items-center">
        <div className="flex justify-start">
          {backHref || canGoBack ? (
            backHref ? (
              <Link
                href={backHref}
                className="flex h-10 w-10 items-center justify-center rounded-full text-[18px] font-medium text-[#4B5565]"
              >
                ←
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => router.back()}
                className="flex h-10 w-10 items-center justify-center rounded-full text-[18px] font-medium text-[#4B5565]"
              >
                ←
              </button>
            )
          ) : null}
        </div>

        <div className="flex justify-center">
          <Image
            src="/brand/shure-fund-logo-horizontal.png"
            alt="Shure.Fund"
            width={346}
            height={68}
            className="h-[22px] w-auto object-contain"
            priority
          />
        </div>

        <div className="flex justify-end">
          <Link
            href="/settings"
            className="flex flex-col items-center gap-1 text-[#102345]"
            aria-label="Open settings"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EAF0FF] text-sm font-semibold text-[#102345]">
              LM
            </span>
            {showAccountLabel ? <span className="text-[11px] font-semibold text-[#667085]">Settings</span> : null}
          </Link>
        </div>
      </div>
      <div className="mt-2 flex justify-center">
        <RoleSwitcher />
      </div>
    </div>
  );
}
