import { redirect } from "next/navigation";

/**
 * /activity → redirect to inbox (the real unified action feed).
 */
export default function ActivityPage() {
  redirect("/inbox");
}
