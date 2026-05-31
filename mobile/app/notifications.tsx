import { useEffect, useState, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { listNotifications, markAllNotificationsRead, markNotificationRead } from "@/lib/api";
import type { AppNotification } from "../../src/web-app/lib/types";

const TYPE_ICON: Record<string, string> = {
  payment_ready: "💳", approval_required: "✅", evidence_required: "📎",
  variation_submitted: "📋", variation_approved: "✔️", variation_rejected: "✖️",
  dispute_raised: "⚠️", dispute_resolved: "🔒", funding_gap: "💸",
};

const fmt = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { setNotifications(await listNotifications()); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleMarkAllRead() {
    await markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  async function handleTap(n: AppNotification) {
    if (!n.read) {
      await markNotificationRead(n.id);
      setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, read: true } : x));
    }
    if (n.action_url) {
      // Navigate to the equivalent web route — mobile routing would differ in full build
    }
  }

  if (loading) return <View style={s.center}><ActivityIndicator color="#34d399" /></View>;

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <View style={s.container}>
      <View style={s.topBar}>
        <Text style={s.heading}>Notifications</Text>
        {unread > 0 && (
          <TouchableOpacity onPress={handleMarkAllRead}>
            <Text style={s.markAll}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#34d399" />}
        renderItem={({ item: n }) => (
          <TouchableOpacity style={[s.card, n.read && s.cardRead]} onPress={() => handleTap(n)}>
            <Text style={s.icon}>{TYPE_ICON[n.type] ?? "🔔"}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[s.msg, n.read && s.msgRead]}>{n.message}</Text>
              <Text style={s.time}>{fmt.format(new Date(n.created_at))}</Text>
            </View>
            {!n.read && <View style={s.dot} />}
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={s.empty}>No notifications yet.</Text>}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0d1144" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0d1144" },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, paddingTop: 60 },
  heading: { fontSize: 24, fontWeight: "900", color: "#fff" },
  markAll: { fontSize: 13, color: "#94a3b8" },
  card: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    marginHorizontal: 16, marginBottom: 8, padding: 14,
    borderRadius: 18, backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  cardRead: { opacity: 0.55 },
  icon: { fontSize: 20, marginTop: 1 },
  msg: { fontSize: 13, color: "#e2e8f0", lineHeight: 18 },
  msgRead: { color: "#94a3b8" },
  time: { fontSize: 11, color: "#6b7280", marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#60a5fa", marginTop: 5, flexShrink: 0 },
  empty: { textAlign: "center", color: "#6b7280", marginTop: 60 },
});
