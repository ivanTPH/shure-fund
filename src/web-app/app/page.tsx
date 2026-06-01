import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getRole } from "@/lib/auth";
import type { AppRole } from "@/lib/auth";
import DashboardClient from "./DashboardClient";
import type { AttentionItems } from "./projects/ProjectsClient";

export default async function DashboardPage() {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) redirect("/auth/login");

  const role = (getRole(user) ?? null) as AppRole | null;
  const service = createServiceClient();

  // Fetch projects with stage counts and wallet balance
  const { data: rawProjects } = await service
    .from("projects")
    .select(`
      id, name, address, status, created_at, funder_id,
      wallets ( available_amount, balance ),
      contracts (
        id, total_value,
        contract_stages ( id, name, status, value )
      )
    `)
    .order("created_at", { ascending: false });

  // Fetch recent unread notifications for this user
  const { data: rawNotifications } = await service
    .from("notifications")
    .select("id, type, message, entity_name, action_url, created_at, required_action")
    .eq("user_id", user.id)
    .eq("read", false)
    .order("created_at", { ascending: false })
    .limit(5);

  // Build enriched project list
  const projects = (rawProjects ?? []).map((p) => {
    const walletRow = Array.isArray(p.wallets) ? p.wallets[0] : p.wallets;
    const contracts = p.contracts ?? [];
    const allStages = contracts.flatMap((c) => c.contract_stages ?? []);
    const totalStages = allStages.length;
    const completedStages = allStages.filter((s) => s.status === "released").length;
    const totalValue = contracts.reduce((sum, c) => sum + Number(c.total_value ?? 0), 0);
    const totalDrawn = allStages
      .filter((s) => s.status === "released")
      .reduce((sum, s) => sum + Number(s.value ?? 0), 0);

    return {
      id: p.id,
      name: p.name,
      address: p.address ?? "",
      status: p.status,
      totalStages,
      completedStages,
      totalValue,
      totalDrawn,
      walletAvailable: Number(walletRow?.available_amount ?? 0),
    };
  });

  // Cross-project metrics
  const totalCommitted      = projects.reduce((s, p) => s + p.totalValue, 0);
  const totalDrawn          = projects.reduce((s, p) => s + p.totalDrawn, 0);
  const activeProjects      = projects.filter((p) => p.status === "active").length;
  const pendingActions      = (rawNotifications ?? []).length;
  const totalWalletAvailable = projects.reduce((s, p) => s + p.walletAvailable, 0);

  // Attention items for funder / admin
  let attentionItems: AttentionItems | null = null;
  if (role === "funder" || role === "admin") {
    type RawStage    = { id: string; name: string; status: string; value: number };
    type RawContract = { id: string; total_value: number; contract_stages: RawStage[] };
    type RawProject  = { id: string; name: string; funder_id: string | null; contracts: RawContract[] | null };

    const myProjects = (rawProjects ?? []).filter(
      (p) => role === "admin" || p.funder_id === user.id,
    ) as unknown as RawProject[];

    function projectForStage(stageId: string) {
      for (const p of myProjects) {
        for (const c of (p.contracts ?? []) as RawContract[]) {
          if ((c.contract_stages ?? []).some((s) => s.id === stageId)) return p;
        }
      }
      return null;
    }

    const stagesReadyToRelease = myProjects.flatMap((p) =>
      ((p.contracts ?? []) as RawContract[]).flatMap((c) =>
        (c.contract_stages ?? [])
          .filter((s) => s.status === "available_to_release")
          .map((s) => ({
            stageId:     s.id,
            stageName:   s.name,
            projectId:   p.id as string,
            projectName: p.name as string,
            value:       Number(s.value ?? 0),
          })),
      ),
    );

    const allMyStageIds = myProjects.flatMap((p) =>
      ((p.contracts ?? []) as RawContract[]).flatMap((c) => (c.contract_stages ?? []).map((s) => s.id)),
    );

    let disputesNeedingAction: AttentionItems["disputesNeedingAction"] = [];
    if (allMyStageIds.length > 0) {
      const { data: rawDisputes } = await service
        .from("disputes")
        .select("id, status, reason, stage_id")
        .in("stage_id", allMyStageIds)
        .in("status", ["raised", "under_review"]);

      disputesNeedingAction = (rawDisputes ?? []).map((d) => {
        const proj      = projectForStage(d.stage_id);
        const stageName = myProjects
          .flatMap((p) => ((p.contracts ?? []) as RawContract[]).flatMap((c) => c.contract_stages ?? []))
          .find((s) => s.id === d.stage_id)?.name ?? "";
        return {
          disputeId:   d.id,
          stageId:     d.stage_id,
          stageName,
          projectId:   (proj?.id   ?? "") as string,
          projectName: (proj?.name ?? "") as string,
          status:      d.status,
          reason:      d.reason,
        };
      });
    }

    attentionItems = { stagesReadyToRelease, disputesNeedingAction };
  }

  return (
    <DashboardClient
      userName={user.user_metadata?.full_name ?? user.email ?? ""}
      userRole={role}
      metrics={{ totalProjects: projects.length, activeProjects, totalCommitted, totalDrawn, totalWalletAvailable, pendingActions }}
      recentNotifications={(rawNotifications ?? []).map((n) => ({
        id:              n.id,
        type:            n.type,
        message:         n.message,
        entity_name:     n.entity_name,
        action_url:      n.action_url,
        created_at:      n.created_at,
        required_action: n.required_action,
      }))}
      projects={projects}
      attentionItems={attentionItems}
      canCreateProject={role === "admin" || role === "developer"}
    />
  );
}
