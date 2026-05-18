import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getRole } from "@/lib/auth";
import type { AppRole } from "@/lib/auth";
import ProjectsClient from "./ProjectsClient";

export default async function ProjectsPage() {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) redirect("/auth/login?redirectTo=/projects");

  const role = (getRole(user) ?? null) as AppRole | null;
  const service = createServiceClient();

  // Fetch projects with stage counts and wallet balance in one shot
  const { data: rawProjects } = await service
    .from("projects")
    .select(`
      id, name, address, status, created_at,
      wallets ( available_amount, balance ),
      contracts (
        total_value,
        contract_stages ( id, status )
      )
    `)
    .order("created_at", { ascending: false });

  const projects = (rawProjects ?? []).map((p) => {
    const walletRow = Array.isArray(p.wallets) ? p.wallets[0] : p.wallets;
    const contracts = (p.contracts ?? []) as Array<{
      total_value: number;
      contract_stages: Array<{ id: string; status: string }>;
    }>;
    const allStages = contracts.flatMap((c) => c.contract_stages ?? []);
    const totalStages = allStages.length;
    const completedStages = allStages.filter((s) => s.status === "released").length;
    const totalValue = contracts.reduce((sum, c) => sum + Number(c.total_value ?? 0), 0);

    return {
      id: p.id,
      name: p.name,
      address: p.address ?? "",
      status: p.status,
      createdAt: p.created_at,
      totalStages,
      completedStages,
      totalValue,
      walletBalance: Number(walletRow?.balance ?? 0),
      walletAvailable: Number(walletRow?.available_amount ?? 0),
    };
  });

  const canCreateProject = role === "admin" || role === "developer";

  return <ProjectsClient projects={projects} canCreateProject={canCreateProject} />;
}
