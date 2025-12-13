import React, { useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
} from "react-native";

// 🔗 METTI QUI IL TUO BACKEND (Render)
const API_BASE_URL = "https://forcreators.vip";

export default function App() {
  const [tab, setTab] = useState<"signup" | "login">("signup");

  // SIGNUP
  const [suEmail, setSuEmail] = useState("");
  const [suPassword, setSuPassword] = useState("");
  const [suPlatform, setSuPlatform] = useState("instagram");
  const [suUsername, setSuUsername] = useState("");
  const [suFollowers, setSuFollowers] = useState("");
  const [suProfiles, setSuProfiles] = useState("1");

  // LOGIN
  const [liEmail, setLiEmail] = useState("");
  const [liPassword, setLiPassword] = useState("");

  // STATO DASHBOARD
  const [currentUserId, setCurrentUserId] = useState(null);
  const [userData, setUserData] = useState(null);
  const [mediaKit, setMediaKit] = useState(null);
  const [tips, setTips] = useState(null);

  // STATUS MESSAGGI
  const [signupStatus, setSignupStatus] = useState("");
  const [loginStatus, setLoginStatus] = useState("");
  const [mediaKitStatus, setMediaKitStatus] = useState("");

  // ======================
  // FUNZIONI DI SUPPORTO
  // ======================

  const setStatus = (setter, msg) => {
    setter(msg || "");
  };

  const formatPrice = (value) => {
    if (value === null || value === undefined || isNaN(value)) return "-";
    const v = Number(value);
    if (v === 0) return "0 €";
    return v.toFixed(2).replace(".", ",") + " €";
  };

  const segmentLabelText = (segment) => {
    if (segment === "casual") return 'Casual · profilo "sport"';
    if (segment === "emerging") return "Emergente · primi passi nel mondo brand";
    if (segment === "pro") return "Creator Pro · collaborazioni strutturate";
    if (segment === "agency") return "Top / Agenzia · gestione profili importanti";
    return "Profilo";
  };

  const fetchJson = async (path, options = {}) => {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    if (!res.ok) {
      let detail = "Errore di rete";
      try {
        const data = await res.json();
        if (data && data.detail) detail = data.detail;
      } catch (e) {}
      throw new Error(detail);
    }
    return res.json();
  };

  const loadUserData = async (userId) => {
    const data = await fetchJson(`/api/user?user_id=${encodeURIComponent(userId)}`);
    setUserData(data);
    setCurrentUserId(userId);
    return data;
  };

  const loadMediaKit = async (userId) => {
    const kit = await fetchJson(`/api/media-kit?user_id=${encodeURIComponent(userId)}`);
    setMediaKit(kit);
    return kit;
  };

  const loadProfileTips = async (userId) => {
    const tipsData = await fetchJson(`/api/profile-tips?user_id=${encodeURIComponent(userId)}`);
    setTips(tipsData);
    return tipsData;
  };

  // ==============
  // HANDLER SIGNUP
  // ==============

  const handleSignup = async () => {
    const followersNum = Number(suFollowers || "0");
    const profilesNum = Number(suProfiles || "1");

    if (!suEmail || !suPassword || !suUsername || isNaN(followersNum)) {
      setStatus(setSignupStatus, "Compila tutti i campi obbligatori.");
      return;
    }
    if (suPassword.length < 6) {
      setStatus(setSignupStatus, "Password troppo corta (minimo 6 caratteri).");
      return;
    }
    if (followersNum < 0) {
      setStatus(setSignupStatus, "Follower non validi.");
      return;
    }

    setStatus(setSignupStatus, "Creo l'account e calcolo il segmento...");
    setStatus(setLoginStatus, "");
    setStatus(setMediaKitStatus, "");

    try {
      const signupRes = await fetchJson("/api/signup", {
        method: "POST",
        body: JSON.stringify({
          email: suEmail.trim(),
          password: suPassword,
          main_platform: suPlatform,
          username: suUsername.trim(),
          followers: followersNum,
          profiles_count: profilesNum,
        }),
      });

      const userId = signupRes.user_id;
      const userInfo = await loadUserData(userId);
      await loadMediaKit(userId);
      await loadProfileTips(userId);

      setStatus(setSignupStatus, "Account creato. Segmento calcolato.");
      // se vuoi, puoi switchare direttamente alla tab login
      // setTab("login");
    } catch (err) {
      setStatus(setSignupStatus, err.message || "Errore durante la registrazione.");
    }
  };

  // =============
  // HANDLER LOGIN
  // =============

  const handleLogin = async () => {
    if (!liEmail || !liPassword) {
      setStatus(setLoginStatus, "Inserisci email e password.");
      return;
    }

    setStatus(setLoginStatus, "Verifico i dati di accesso...");
    setStatus(setSignupStatus, "");
    setStatus(setMediaKitStatus, "");

    try {
      const loginRes = await fetchJson("/api/login", {
        method: "POST",
        body: JSON.stringify({
          email: liEmail.trim(),
          password: liPassword,
        }),
      });

      const userId = loginRes.user_id;
      await loadUserData(userId);
      await loadMediaKit(userId);
      await loadProfileTips(userId);

      setStatus(setLoginStatus, "Accesso effettuato.");
    } catch (err) {
      setStatus(setLoginStatus, err.message || "Errore durante il login.");
    }
  };

  // ====================
  // HANDLER MEDIA KIT BTN
  // ====================

  const handleMediaKit = async () => {
    if (!currentUserId) {
      setStatus(setMediaKitStatus, "Crea o carica prima un account.");
      return;
    }
    setStatus(setMediaKitStatus, "Genero il media kit con i prezzi suggeriti...");

    try {
      await loadMediaKit(currentUserId);
      setStatus(setMediaKitStatus, "Media kit aggiornato.");
    } catch (err) {
      setStatus(setMediaKitStatus, err.message || "Errore nel media kit.");
    }
  };

  // ==============
  // RENDER UI
  // ==============

  const renderAuthTabs = () => (
    <View style={styles.tabs}>
      <TouchableOpacity
        style={[styles.tab, tab === "signup" && styles.tabActive]}
        onPress={() => setTab("signup")}
      >
        <Text style={[styles.tabText, tab === "signup" && styles.tabTextActive]}>
          Registrazione
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, tab === "login" && styles.tabActive]}
        onPress={() => setTab("login")}
      >
        <Text style={[styles.tabText, tab === "login" && styles.tabTextActive]}>
          Login
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderSignup = () => (
    <View>
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldGroupTitle}>Dati account</Text>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="tu@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={suEmail}
            onChangeText={setSuEmail}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Minimo 6 caratteri"
            secureTextEntry
            value={suPassword}
            onChangeText={setSuPassword}
          />
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldGroupTitle}>Profilo social principale</Text>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Piattaforma</Text>
          <View style={styles.platformRow}>
            {["instagram", "tiktok", "youtube", "twitch"].map((p) => (
              <TouchableOpacity
                key={p}
                style={[
                  styles.platformChip,
                  suPlatform === p && styles.platformChipActive,
                ]}
                onPress={() => setSuPlatform(p)}
              >
                <Text
                  style={[
                    styles.platformChipText,
                    suPlatform === p && styles.platformChipTextActive,
                  ]}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Username</Text>
          <TextInput
            style={styles.input}
            placeholder="@il_tuo_handle"
            autoCapitalize="none"
            value={suUsername}
            onChangeText={setSuUsername}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Follower complessivi</Text>
          <Text style={styles.fieldHint}>
            Somma approssimativa tra tutte le piattaforme.
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Es. 12500"
            keyboardType="numeric"
            value={suFollowers}
            onChangeText={setSuFollowers}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Profili che gestisci</Text>
          <Text style={styles.fieldHint}>Per agenzie / team (altrimenti lascia 1).</Text>
          <TextInput
            style={styles.input}
            placeholder="1"
            keyboardType="numeric"
            value={suProfiles}
            onChangeText={setSuProfiles}
          />
        </View>
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={handleSignup}>
        <Text style={styles.primaryButtonIcon}>🚀</Text>
        <Text style={styles.primaryButtonText}>Calcola segmento e crea account</Text>
      </TouchableOpacity>
      {!!signupStatus && <Text style={styles.statusText}>{signupStatus}</Text>}
    </View>
  );

  const renderLogin = () => (
    <View>
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldGroupTitle}>Login</Text>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="tu@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={liEmail}
            onChangeText={setLiEmail}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="La tua password"
            secureTextEntry
            value={liPassword}
            onChangeText={setLiPassword}
          />
        </View>
      </View>
      <TouchableOpacity style={styles.primaryButton} onPress={handleLogin}>
        <Text style={styles.primaryButtonIcon}>🔑</Text>
        <Text style={styles.primaryButtonText}>Entra nel tuo profilo</Text>
      </TouchableOpacity>
      {!!loginStatus && <Text style={styles.statusText}>{loginStatus}</Text>}
    </View>
  );

  const renderDashboard = () => {
    if (!userData) return null;

    const plan = userData.plan || {};
    const segment = userData.segment;

    return (
      <View style={styles.dashboardSection}>
        <Text style={styles.sectionTitle}>
          La tua posizione nel mondo social
        </Text>
        <Text style={styles.sectionBadge}>{segmentLabelText(segment)}</Text>

        {/* Card segmento */}
        <View style={styles.dashCard}>
          <Text style={styles.dashCardTitle}>Segmento & piano consigliato</Text>
          <Text style={styles.dashHighlight}>{plan.label || "-"}</Text>
          <View style={styles.pillTag}>
            <Text style={styles.pillTagText}>
              {(segment || "-").toUpperCase()}
            </Text>
          </View>
          <Text style={styles.dashDesc}>{plan.description || "-"}</Text>

          <View style={styles.priceRow}>
            <View>
              <Text style={styles.priceBig}>
                {plan.monthly_price === 0
                  ? "0 €"
                  : formatPrice(plan.monthly_price)}
              </Text>
              <Text style={styles.pricePeriod}>al mese</Text>
            </View>
            <View>
              <Text style={styles.priceBig}>
                {plan.yearly_price === null || plan.yearly_price === undefined
                  ? "—"
                  : formatPrice(plan.yearly_price)}
              </Text>
              <Text style={styles.pricePeriod}>all'anno</Text>
            </View>
          </View>
          {!!plan.billing_note && (
            <Text style={styles.priceNote}>{plan.billing_note}</Text>
          )}
        </View>

        {/* Card dati profilo */}
        <View style={styles.dashCard}>
          <Text style={styles.dashCardTitle}>Dati di base profilo</Text>
          <View style={styles.mediaKitRow}>
            <Text style={styles.mediaKitLabel}>Email</Text>
            <Text style={styles.mediaKitValue}>{userData.email}</Text>
          </View>
          <View style={styles.mediaKitRow}>
            <Text style={styles.mediaKitLabel}>Piattaforma</Text>
            <Text style={styles.mediaKitValue}>{userData.main_platform}</Text>
          </View>
          <View style={styles.mediaKitRow}>
            <Text style={styles.mediaKitLabel}>Username</Text>
            <Text style={styles.mediaKitValue}>{userData.username}</Text>
          </View>
          <View style={styles.mediaKitRow}>
            <Text style={styles.mediaKitLabel}>Follower complessivi</Text>
            <Text style={styles.mediaKitValue}>
              {userData.followers.toLocaleString("it-IT")}
            </Text>
          </View>
          <View style={styles.mediaKitRow}>
            <Text style={styles.mediaKitLabel}>Profili gestiti</Text>
            <Text style={styles.mediaKitValue}>{userData.profiles_count}</Text>
          </View>

          <TouchableOpacity style={[styles.primaryButton, { marginTop: 10 }]} onPress={handleMediaKit}>
            <Text style={styles.primaryButtonIcon}>📄</Text>
            <Text style={styles.primaryButtonText}>
              Genera media kit con prezzi suggeriti
            </Text>
          </TouchableOpacity>
          {!!mediaKitStatus && (
            <Text style={styles.statusText}>{mediaKitStatus}</Text>
          )}
        </View>

        {/* Media kit */}
        <Text style={[styles.sectionTitle, { marginTop: 18 }]}>
          Media kit & prezzi suggeriti
        </Text>
        {mediaKit ? (
          <View style={styles.dashCard}>
            <Text style={styles.dashCardTitle}>
              Media kit per {mediaKit.username}
            </Text>
            <Text style={styles.dashDesc}>
              Numeri chiave del profilo e prezzi consigliati per i tuoi contenuti.
            </Text>

            <View style={styles.mediaKitRow}>
              <Text style={styles.mediaKitLabel}>Profilo</Text>
              <Text style={styles.mediaKitValue}>
                {mediaKit.username} su {mediaKit.main_platform}
              </Text>
            </View>
            <View style={styles.mediaKitRow}>
              <Text style={styles.mediaKitLabel}>Segmento</Text>
              <Text style={styles.mediaKitValue}>
                {mediaKit.segment_label}
              </Text>
            </View>
            <View style={styles.mediaKitRow}>
              <Text style={styles.mediaKitLabel}>Follower</Text>
              <Text style={styles.mediaKitValue}>
                {mediaKit.followers.toLocaleString("it-IT")}
              </Text>
            </View>
            <View style={styles.mediaKitRow}>
              <Text style={styles.mediaKitLabel}>Views post stimate</Text>
              <Text style={styles.mediaKitValue}>
                {mediaKit.estimated.post_avg_views.toLocaleString("it-IT")}
              </Text>
            </View>
            <View style={styles.mediaKitRow}>
              <Text style={styles.mediaKitLabel}>Views stories stimate</Text>
              <Text style={styles.mediaKitValue}>
                {mediaKit.estimated.story_avg_views.toLocaleString("it-IT")}
              </Text>
            </View>

            <Text style={[styles.dashCardTitle, { marginTop: 10 }]}>
              Prezzi suggeriti (EUR)
            </Text>
            <View style={styles.mediaKitRow}>
              <Text style={styles.mediaKitLabel}>Post singolo</Text>
              <Text style={styles.mediaKitValue}>
                {formatPrice(mediaKit.suggested_rates_eur.single_post)}
              </Text>
            </View>
            <View style={styles.mediaKitRow}>
              <Text style={styles.mediaKitLabel}>Story singola</Text>
              <Text style={styles.mediaKitValue}>
                {formatPrice(mediaKit.suggested_rates_eur.single_story)}
              </Text>
            </View>
            <View style={styles.mediaKitRow}>
              <Text style={styles.mediaKitLabel}>Pacchetto post + 3 stories</Text>
              <Text style={styles.mediaKitValue}>
                {formatPrice(mediaKit.suggested_rates_eur.bundle_post_3stories)}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.dashCard}>
            <Text style={styles.dashCardTitle}>Nessun media kit generato.</Text>
            <Text style={styles.dashDesc}>
              Premi sul pulsante per generare il media kit con i prezzi suggeriti.
            </Text>
          </View>
        )}

        {/* Consigli profilo */}
        <Text style={[styles.sectionTitle, { marginTop: 18 }]}>
          Consigli per il tuo profilo
        </Text>
        <View style={styles.dashCard}>
          <Text style={styles.dashCardTitle}>
            {tips?.level || "Suggerimenti non disponibili"}
          </Text>
          <Text style={styles.dashDesc}>{tips?.summary || ""}</Text>
          {Array.isArray(tips?.tips) &&
            tips.tips.map((t, idx) => (
              <Text key={idx} style={styles.tipItem}>
                • {t}
              </Text>
            ))}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.container}>
        {/* HEADER SEMPLICE */}
        <View style={styles.header}>
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>fc</Text>
          </View>
          <View>
            <Text style={styles.brandName}>ForCreators</Text>
            <Text style={styles.brandSub}>
              Da profilo casual a top agency, con un solo strumento.
            </Text>
          </View>
        </View>

        {/* HERO */}
        <Text style={styles.pillTop}>Casual · Emergente · Pro · Agenzia</Text>
        <Text style={styles.heroTitle}>
          Scopri quanto “vali”{" "}
          <Text style={styles.heroHighlight}>come profilo social</Text>.
        </Text>
        <Text style={styles.heroSubtitle}>
          Inserisci i tuoi follower e lascia che il sistema ti classifichi in{" "}
          <Text style={{ fontWeight: "600" }}>
            Casual, Emergente, Creator Pro o Top Agenzia
          </Text>{" "}
          con il piano ideale: gratuito, 4,90€, 9,90€ o 99–399€ al mese.
        </Text>

        {/* CARD AUTENTICAZIONE */}
        <View style={styles.card}>
          {renderAuthTabs()}
          {tab === "signup" ? renderSignup() : renderLogin()}
        </View>

        {/* DASHBOARD */}
        {renderDashboard()}
      </ScrollView>
    </SafeAreaView>
  );
}

// ==================
// STILI
// ==================
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#eef2ff",
  },
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  logoBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#6366f1",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  logoText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 18,
  },
  brandName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#4f46e5",
  },
  brandSub: {
    fontSize: 12,
    color: "#6b7280",
  },
  pillTop: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.6)",
    backgroundColor: "rgba(15,23,42,0.03)",
    fontSize: 12,
    color: "#4f46e5",
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginBottom: 8,
    color: "#0f172a",
  },
  heroHighlight: {
    color: "#6366f1",
  },
  heroSubtitle: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 16,
  },
  card: {
    borderRadius: 20,
    backgroundColor: "#ffffff",
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    marginBottom: 20,
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: "rgba(148,163,184,0.12)",
    borderRadius: 999,
    padding: 3,
    marginBottom: 10,
  },
  tab: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 999,
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  tabText: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "500",
  },
  tabTextActive: {
    color: "#4f46e5",
  },
  fieldGroup: {
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.45)",
    padding: 10,
    marginBottom: 10,
  },
  fieldGroupTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4f46e5",
    marginBottom: 6,
  },
  field: {
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#0f172a",
    marginBottom: 2,
  },
  fieldHint: {
    fontSize: 11,
    color: "#6b7280",
    marginBottom: 3,
  },
  input: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 12,
    backgroundColor: "#fff",
  },
  platformRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  platformChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.7)",
    backgroundColor: "#fff",
  },
  platformChipActive: {
    backgroundColor: "#6366f1",
    borderColor: "#6366f1",
  },
  platformChipText: {
    fontSize: 11,
    color: "#6b7280",
  },
  platformChipTextActive: {
    color: "#fff",
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#4f46e5",
    marginTop: 4,
  },
  primaryButtonIcon: {
    fontSize: 14,
    color: "#fff",
    marginRight: 6,
  },
  primaryButtonText: {
    fontSize: 13,
    color: "#fff",
    fontWeight: "600",
  },
  statusText: {
    marginTop: 4,
    fontSize: 11,
    color: "#6b7280",
  },
  dashboardSection: {
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4f46e5",
  },
  sectionBadge: {
    fontSize: 11,
    color: "#6b7280",
    marginBottom: 6,
  },
  dashCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.5)",
  },
  dashCardTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4f46e5",
    marginBottom: 4,
  },
  dashHighlight: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  pillTag: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.7)",
    marginBottom: 4,
  },
  pillTagText: {
    fontSize: 11,
    color: "#6b7280",
  },
  dashDesc: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  priceBig: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  pricePeriod: {
    fontSize: 11,
    color: "#6b7280",
  },
  priceNote: {
    fontSize: 11,
    color: "#6b7280",
    marginTop: 4,
  },
  mediaKitRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  mediaKitLabel: {
    fontSize: 11,
    color: "#6b7280",
  },
  mediaKitValue: {
    fontSize: 12,
    fontWeight: "500",
    color: "#111827",
    marginLeft: 10,
    textAlign: "right",
  },
  tipItem: {
    fontSize: 12,
    color: "#4b5563",
    marginTop: 4,
  },
});
