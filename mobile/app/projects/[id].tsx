import { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet, RefreshControl } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import type { ContractStage } from "../../../src/web-app/lib/types";

type StageWithContract = ContractStage & { contractTitle: string };

export default function ProjectScreen() {
  const { id: projectId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [stages, setStages] = useState<StageWithContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      const { data } = await supabase
        .from("contracts")
        .select("id, title, contract_stages ( id, name, value, status, sequence_order )")
        .eq("project_id", projectId);

      const flat: StageWithContract[] = (data ?? []).flatMap((c: { id: string; title: string; contract_stages: ContractStage[] }) =>
        (c.contract_stages ?? []).map((s) => ({ ...s, contractTitle: c.title }))
      );
      flat.sort((a, b) => a.sequence_order - b.sequence_order);
      setStages(flat);
    } finally { setLoading(false); setRefreshing(false); }
  }

  useEffect(() => { load(); }, [projectId]);

  const STATUS_COLOR: Record<string, string> = {
    pending: "#94a3b8", active: "#60a5fa", approved: "#34d399",
    released: "#a855f7", disputed: "#f97316", cancelled: "#6b7280",
  };

  const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });

  if (loading) return <View style={s.center}><ActivityIndicator color="#34d399" /></View>;

  return (
    <View style={s.container}>
      <FlatList
        data={stages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingTop: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#34d399" />}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={s.card}
            onPress={() => router.push(`/stages/${item.id}?projectId=${projectId}`)}
          >
            <View style={s.cardTop}>
              <View style={{ flex: 1 }}>
                <Text style={s.cardTitle}>{item.name}</Text>
                <Text style={s.cardSub}>{item.contractTitle}</Text>
              </View>
              <Text style={s.cardValue}>{gbp.format(Number(item.value))}</Text>
            </View>
            <Text style={[s.cardStatus, { color: STATUS_COLOR[item.status] ?? "#94a3b8" }]}>
              {item.status.replace(/_/g, " ").toUpperCase()}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={s.empty}>No stages found.</Text>}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0d1144" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0d1144" },
  card: {
    marginBottom: 10, padding: 16, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#fff" },
  cardSub: { fontSize: 12, color: "#94a3b8", marginTop: 2 },
  cardValue: { fontSize: 15, fontWeight: "700", color: "#fff" },
  cardStatus: { fontSize: 10, fontWeight: "700", marginTop: 8, letterSpacing: 1 },
  empty: { textAlign: "center", color: "#6b7280", marginTop: 60 },
});
