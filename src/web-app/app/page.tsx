import { redirect } from "next/navigation";

/**
 * Root route — redirect to the real projects list.
 * Middleware handles unauthenticated users (→ /auth/login).
 */
export default function HomePage() {
  redirect("/projects");
}
