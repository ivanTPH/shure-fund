import type { Page } from "@playwright/test";

/**
 * Dev profile credentials matching the login page DEV_PROFILES.
 * These are the seeded accounts used in development.
 *
 * The login page shows Quick Sign-In buttons in NODE_ENV=development,
 * which auto-create accounts on first use. We click those buttons
 * instead of filling the form manually.
 *
 * The button label maps to the dev profile:
 *   Funder      → admin@harbourcapital.co.uk
 *   Contractor  → contracts@hawthornebuild.co.uk
 *   Commercial  → maya.singh@shure.fund
 *   Professional → owen.blake@shure.fund  (consultant role in app)
 *   Treasury    → leah.mercer@shure.fund  (funder/developer approval)
 *   Developer Co → helen.grant@shure.fund
 */

// Maps our logical role names to the button label on the login page
const DEV_BUTTON_LABEL: Record<string, string> = {
  funder:     "Funder",
  developer:  "Developer Co",
  contractor: "Contractor",
  commercial: "Commercial",
  consultant: "Professional",   // app 'consultant' = login page 'Professional'
  treasury:   "Treasury",
};

// For roles without a dev profile button, use form sign-in
const FORM_CREDENTIALS: Record<string, { email: string; password: string }> = {
  admin: { email: "admin@test.com", password: "password123" },
};

export type UserRole = "funder" | "developer" | "contractor" | "commercial" | "consultant" | "admin" | "treasury";

/**
 * Sign in as a specific role.
 *
 * In development (NODE_ENV=development), clicks the Quick Sign-In button on
 * the login page — this auto-creates the account if it doesn't exist.
 *
 * For roles without a Quick Sign-In button (admin), falls back to form sign-in
 * which auto-creates via the same mechanism on the login page.
 */
export async function signIn(page: Page, role: UserRole): Promise<void> {
  // Clear all cookies to ensure we're unauthenticated before navigating to
  // the login page. Without this, the middleware redirects authenticated users
  // away from /auth/login so we can never click the dev profile buttons.
  await page.context().clearCookies();

  await page.goto("/auth/login");
  await page.waitForLoadState("networkidle");

  const buttonLabel = DEV_BUTTON_LABEL[role];
  const formCreds   = FORM_CREDENTIALS[role];

  if (buttonLabel) {
    // Click the Quick Sign-In dev profile button
    const btn = page.locator(`button:has-text("${buttonLabel}")`).first();
    const isVisible = await btn.isVisible({ timeout: 3_000 }).catch(() => false);

    if (isVisible) {
      await btn.click();
    } else {
      // Dev buttons not shown (e.g. production build) — fall back to form
      const creds = formCreds ?? { email: `${role}@test.com`, password: "password123" };
      await page.fill("#email", creds.email);
      await page.fill("#password", creds.password);
      await page.click("button[type='submit']");
    }
  } else if (formCreds) {
    await page.fill("#email", formCreds.email);
    await page.fill("#password", formCreds.password);
    await page.click("button[type='submit']");
  }

  // Wait until login resolves (navigates away from /auth/login)
  await page.waitForURL((url) => !url.pathname.startsWith("/auth/login"), {
    timeout: 20_000,
  });
  // Ensure all auth cookies are fully written before the caller makes API requests
  await page.waitForLoadState("networkidle");
}

/**
 * Sign out by clearing all browser cookies (clears Supabase session).
 */
export async function signOut(page: Page): Promise<void> {
  await page.context().clearCookies();
}
