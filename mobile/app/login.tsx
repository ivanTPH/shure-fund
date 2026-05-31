import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setError(null);
    if (!email.trim() || !password.trim()) { setError("Email and password are required."); return; }
    setLoading(true);
    try {
      const { error: authErr } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (authErr) { setError(authErr.message); return; }
      router.replace("/");
    } finally { setLoading(false); }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.inner}>
        <Text style={styles.logo}>Shure.Fund</Text>
        <Text style={styles.sub}>Construction finance, governed.</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#6b7280"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#6b7280"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity style={styles.button} onPress={signIn} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign in</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0d1144" },
  inner: { flex: 1, justifyContent: "center", paddingHorizontal: 24 },
  logo: { fontSize: 32, fontWeight: "900", color: "#fff", textAlign: "center", marginBottom: 8 },
  sub: { fontSize: 14, color: "#94a3b8", textAlign: "center", marginBottom: 48 },
  input: {
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.05)", color: "#fff",
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, marginBottom: 12,
  },
  error: { color: "#f87171", fontSize: 13, marginBottom: 12 },
  button: {
    backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 16,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.2)",
    paddingVertical: 16, alignItems: "center", marginTop: 8,
  },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
