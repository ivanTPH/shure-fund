import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getRole } from "@/lib/auth";
import type { AppRole } from "@/lib/auth";
import ProjectsClient from "./ProjectsClient";
import type { AttentionItems } from "./ProjectsClient";

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
      id, name, address, status, created_at, funder_id,
      wallets ( available_amount, balance ),
      contracts (
        id, total_value,
        contract_stages ( id, name, status, value )
      )
    `)
    .order("created_at", { ascending: false });

  const projects = (rawProjects ?? []).map((p) => {
    const walletRow = Array.isArray(p.wallets) ? p.wallets[0] : p.wallets;
    const contracts = (p.contracts ?? []) as Array<{
      id: string;
      total_value: number;
      contract_stages: Array<{ id: string; name: string; status: string; value: number }>;
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

  // Funder attention items — disputes needing review + stages ready to release
  let attentionItems: AttentionItems | null = null;
  if (role === "funder" || role === "admin") {
    type RawStage = { id: string; name: string; status: string; value: number };
    type RawContract = { id: string; total_value: number; contract_stages: RawStage[] };
    type RawProject = { id: string; name: string; funder_id: string | null; contracts: RawContract[] | null };

    const myProjects = (rawProjects ?? []).filter(
      (p) => role === "admin" || p.funder_id === user.id,
    ) as unknown as RawProject[];

    // Helper: find which project a stage belongs to
    function projectForStage(stageId: string) {
      for (const p of myProjects) {
        const contracts = (p.contracts ?? []) as RawContract[];
        for (const c of contracts) {
          if ((c.contract_stages ?? []).some((s) => s.id === stageId)) return p;
        }
      }
      return null;
    }

    // Stages ready to release
    const stagesReadyToRelease = myProjects
      .flatMap((p) =>
        ((p.contracts ?? []) as RawContract[]).flatMap((c) =>
          (c.contract_stages ?? [])
            .filter((s) => s.status === "available_to_release")
            .map((s) => ({
              stageId: s.id,
              stageName: s.name,
              projectId: p.id as string,
              projectName: p.name as string,
              value: Number(s.value ?? 0),
            })),
        ),
      );

    // Disputes needing action — fetch for all stages in funder's projects
    const allMyStageIds = myProjects
      .flatMap((p) => ((p.contracts ?? []) as RawContract[]).flatMap((c) => (c.contract_stages ?? []).map((s) => s.id)));

    let disputesNeedingAction: AttentionItems["disputesNeedingAction"] = [];
    if (allMyStageIds.length > 0) {
      const { data: rawDisputes } = await service
        .from("disputes")
        .select("id, status, reason, stage_id")
        .in("stage_id", allMyStageIds)
        .in("status", ["raised", "under_review"]);

      disputesNeedingAction = (rawDisputes ?? []).map((d) => {
        const proj = projectForStage(d.stage_id);
        const stageName =
          myProjects
            .flatMap((p) => ((p.contracts ?? []) as RawContract[]).flatMap((c) => c.contract_stages ?? []))
            .find((s) => s.id === d.stage_id)?.name ?? "";
        return {
          disputeId: d.id,
          stageId: d.stage_id,
          stageName,
          projectId: (proj?.id ?? "") as string,
          projectName: (proj?.name ?? "") as string,
          status: d.status,
          reason: d.reason,
        };
      });
    }

    attentionItems = { stagesReadyToRelease, disputesNeedingAction };
  }

  return (
    <ProjectsClient
      projects={projects}
      canCreateProject={canCreateProject}
      attentionItems={attentionItems}
    />
  );
}
