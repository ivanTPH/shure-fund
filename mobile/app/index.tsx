import { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { listProjects } from "@/lib/api";
import type { Project } from "../../src/web-app/lib/types";

export default function ProjectsScreen() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const result = await listProjects();
      setProjects(result);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load projects");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#34d399" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Shure.Fund</Text>
        <TouchableOpacity onPress={signOut}>
          <Text style={styles.signOut}>Sign out</Text>
        </TouchableOpacity>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <FlatList
        data={projects}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#34d399" />}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/projects/${item.id}`)}
          >
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardSub}>{item.location}</Text>
            <Text style={[styles.cardStatus, { color: item.status === "active" ? "#34d399" : "#94a3b8" }]}>
              {item.status.toUpperCase()}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No projects found.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0d1144" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0d1144" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, paddingTop: 60 },
  title: { fontSize: 24, fontWeight: "900", color: "#fff" },
  signOut: { fontSize: 14, color: "#94a3b8" },
  card: {
    marginHorizontal: 16, marginBottom: 10,
    padding: 16, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#fff" },
  cardSub: { fontSize: 13, color: "#94a3b8", marginTop: 2 },
  cardStatus: { fontSize: 10, fontWeight: "700", marginTop: 6, letterSpacing: 1 },
  empty: { textAlign: "center", color: "#6b7280", marginTop: 60 },
  error: { color: "#f87171", marginHorizontal: 16, marginBottom: 8, fontSize: 13 },
});
