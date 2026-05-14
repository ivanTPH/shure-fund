"use client";

import { actionIconMap } from "@/lib/notificationIcons";

type ActionButton = {
  label: string;
  icon?: "approve" | "reject" | "message" | "review";
  onClick: () => void;
};

export default function InlineActionBar({
  primary,
  secondary,
  tertiary,
}: {
  primary: ActionButton;
  secondary: ActionButton[];
  tertiary?: ActionButton;
}) {
  return (
    <div className="space-y-3">
      {(() => {
        const PrimaryIcon = primary.icon ? actionIconMap[primary.icon] : null;
        return (
      <button
        type="button"
        onClick={primary.onClick}
        className="w-full rounded-2xl bg-[#102345] px-4 py-3 text-sm font-semibold text-white"
      >
        <span className="inline-flex items-center gap-2">
          {PrimaryIcon ? <PrimaryIcon sx={{ fontSize: 18 }} /> : null}
          <span>{primary.label}</span>
        </span>
      </button>
        );
      })()}
      <div className="grid gap-3 sm:grid-cols-2">
        {secondary.map((action) => (
          (() => {
            const SecondaryIcon = action.icon ? actionIconMap[action.icon] : null;
            return (
              <button
                key={action.label}
                type="button"
                onClick={action.onClick}
                className="rounded-2xl border border-[#D7DBE2] bg-white px-4 py-3 text-sm font-semibold text-[#102345]"
              >
                <span className="inline-flex items-center gap-2">
                  {SecondaryIcon ? <SecondaryIcon sx={{ fontSize: 18 }} /> : null}
                  <span>{action.label}</span>
                </span>
              </button>
            );
          })()
        ))}
      </div>
      {tertiary ? (
        (() => {
          const TertiaryIcon = tertiary.icon ? actionIconMap[tertiary.icon] : null;
          return (
        <button
          type="button"
          onClick={tertiary.onClick}
          className="text-sm font-semibold text-[#102345]"
        >
          <span className="inline-flex items-center gap-2">
            {TertiaryIcon ? <TertiaryIcon sx={{ fontSize: 18 }} /> : null}
            <span>{tertiary.label}</span>
          </span>
        </button>
          );
        })()
      ) : null}
    </div>
  );
}
