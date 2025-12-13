// app/(tabs)/index.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import TopBar from '../components/TopBar';
import GradientText from '../components/GradientText';

const API_BASE = 'https://forcreators.vip';

type Plan = {
  label: string;
  description: string;
  monthly_price: number;
  yearly_price: number | null;
  billing_note?: string;
};

type UserData = {
  user_id: string;
  email: string;
  main_platform: string;
  username: string;
  followers: number;
  profiles_count: number;
  segment: 'casual' | 'emerging' | 'pro' | 'agency';
  plan: Plan;
};

type MediaKit = {
  username: string;
  main_platform: string;
  segment: string;
  segment_label: string;
  followers: number;
  estimated: {
    post_avg_views: number;
    story_avg_views: number;
  };
  suggested_rates_eur: {
    single_post: number;
    single_story: number;
    bundle_post_3stories: number;
  };
};

type ProfileTips = {
  level: string;
  summary: string;
  tips: string[];
};

export default function DashboardScreen() {
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [mediaKit, setMediaKit] = useState<MediaKit | null>(null);
  const [profileTips, setProfileTips] = useState<ProfileTips | null>(null);

  // signup form
  const [suEmail, setSuEmail] = useState('');
  const [suPassword, setSuPassword] = useState('');
  const [suPlatform, setSuPlatform] = useState('instagram');
  const [suUsername, setSuUsername] = useState('');
  const [suFollowers, setSuFollowers] = useState('');
  const [suProfiles, setSuProfiles] = useState('1');

  // login form
  const [liEmail, setLiEmail] = useState('');
  const [liPassword, setLiPassword] = useState('');

  const [signupStatus, setSignupStatus] = useState<string | null>(null);
  const [loginStatus, setLoginStatus] = useState<string | null>(null);
  const [mediaKitStatus, setMediaKitStatus] = useState<string | null>(null);

  async function fetchUser(userId: string) {
    try {
      const res = await fetch(
        `${API_BASE}/api/user?user_id=${encodeURIComponent(userId)}`
      );
      if (!res.ok) throw new Error('Errore nel recupero dati utente.');
      const data: UserData = await res.json();
      setCurrentUser(data);
      loadProfileTips(data.user_id);
    } catch (err) {
      console.log(err);
      setSignupStatus('Errore nel recupero dati utente.');
    }
  }

  async function handleSignup() {
    setSignupStatus(null);
    setLoginStatus(null);
    setMediaKitStatus(null);

    const followersNum = Number(suFollowers || '0');
    const profilesNum = Number(suProfiles || '1');

    if (!suEmail || !suPassword || !suUsername || isNaN(followersNum)) {
      setSignupStatus('Compila tutti i campi obbligatori.');
      return;
    }
    if (suPassword.length < 6) {
      setSignupStatus('Password troppo corta (minimo 6 caratteri).');
      return;
    }
    if (followersNum < 0) {
      setSignupStatus('Follower non validi.');
      return;
    }

    try {
      setSignupStatus("Creo l'account e calcolo il segmento...");
      const res = await fetch(`${API_BASE}/api/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: suEmail.trim(),
          password: suPassword,
          main_platform: suPlatform,
          username: suUsername.trim(),
          followers: followersNum,
          profiles_count: profilesNum > 0 ? profilesNum : 1,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSignupStatus(data.detail || 'Errore durante la registrazione.');
        return;
      }
      const data = await res.json();
      setSignupStatus('Account creato. Segmento calcolato.');
      await fetchUser(data.user_id);
    } catch (err) {
      console.log(err);
      setSignupStatus('Errore di rete.');
    }
  }

  async function handleLogin() {
    setLoginStatus(null);
    setSignupStatus(null);
    setMediaKitStatus(null);

    if (!liEmail || !liPassword) {
      setLoginStatus('Inserisci email e password.');
      return;
    }

    try {
      setLoginStatus('Verifico i dati di accesso...');
      const res = await fetch(`${API_BASE}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: liEmail.trim(),
          password: liPassword,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setLoginStatus(data.detail || 'Errore durante il login.');
        return;
      }
      const data = await res.json();
      await fetchUser(data.user_id);
      setLoginStatus('Accesso effettuato.');
    } catch (err) {
      console.log(err);
      setLoginStatus('Errore di rete.');
    }
  }

  async function handleMediaKit() {
    if (!currentUser) {
      setMediaKitStatus('Crea o carica prima un account.');
      return;
    }

    try {
      setMediaKitStatus('Genero il media kit con i prezzi suggeriti...');
      const res = await fetch(
        `${API_BASE}/api/media-kit?user_id=${encodeURIComponent(
          currentUser.user_id
        )}`
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMediaKitStatus(data.detail || 'Errore nel media kit.');
        return;
      }
      const kit: MediaKit = await res.json();
      setMediaKit(kit);
      setMediaKitStatus('Media kit aggiornato.');
    } catch (err) {
      console.log(err);
      setMediaKitStatus('Errore di rete.');
    }
  }

  async function loadProfileTips(userId: string) {
    try {
      const res = await fetch(
        `${API_BASE}/api/profile-tips?user_id=${encodeURIComponent(userId)}`
      );
      if (!res.ok) {
        setProfileTips(null);
        return;
      }
      const tips: ProfileTips = await res.json();
      setProfileTips(tips);
    } catch (err) {
      console.log(err);
      setProfileTips(null);
    }
  }

  function formatPrice(value: number | null | undefined) {
    if (value === null || value === undefined || isNaN(value as number)) return '—';
    if (value === 0) return '0 €';
    const v = Number(value);
    return `${v.toFixed(2).replace('.', ',')} €`;
  }

  function segmentLabelText(segment?: string) {
    if (segment === 'casual') return 'Casual · profilo "sport"';
    if (segment === 'emerging') return 'Emergente · primi passi nel mondo brand';
    if (segment === 'pro') return 'Creator Pro · collaborazioni strutturate';
    if (segment === 'agency') return 'Top / Agenzia · gestione profili importanti';
    return 'Profilo';
  }

  return (
    <LinearGradient
      colors={['#eef2ff', '#f3f4f6', '#fdf2ff']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.screen}
    >
      <TopBar />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* HERO */}
        <View style={styles.hero}>
          <View style={styles.heroLeft}>
            <View style={styles.heroPill}>
              <View style={styles.heroPillDot} />
              <Text style={styles.heroPillText}>
                Casual · Emergente · Pro · Agenzia
              </Text>
            </View>

            {/* “come profilo social” con gradiente, senza rettangolo */}
            <View style={styles.heroTitleRow}>
              <Text style={styles.heroTitle}>Scopri quanto “vali”</Text>
              <GradientText style={styles.heroHighlight}>
                come profilo social
              </GradientText>
            </View>

            <Text style={styles.heroSubtitle}>
              Inserisci i tuoi follower e lascia che il sistema ti classifichi in{' '}
              <Text style={styles.heroSubtitleBold}>
                Casual, Emergente, Creator Pro o Top Agenzia
              </Text>{' '}
              con il piano ideale: gratuito, 4,90€, 9,90€ o 99–399€ al mese.
            </Text>

            <View style={styles.heroBullets}>
              <View style={styles.heroBullet}>
                <View style={styles.heroBulletIcon}>
                  <Text style={styles.heroBulletIconText}>①</Text>
                </View>
                <Text style={styles.heroBulletText}>
                  Registrati con email, piattaforma principale e follower complessivi.
                </Text>
              </View>
              <View style={styles.heroBullet}>
                <View style={styles.heroBulletIcon}>
                  <Text style={styles.heroBulletIconText}>②</Text>
                </View>
                <Text style={styles.heroBulletText}>
                  Il sistema calcola il tuo segmento e il piano mensile / annuale ideale.
                </Text>
              </View>
              <View style={styles.heroBullet}>
                <View style={styles.heroBulletIcon}>
                  <Text style={styles.heroBulletIconText}>③</Text>
                </View>
                <Text style={styles.heroBulletText}>
                  Genera un media kit con prezzi suggeriti per post, stories e pacchetti.
                </Text>
              </View>
            </View>

            <View style={styles.heroFootnote}>
              <View style={styles.heroFootnoteBadge}>
                <Text style={styles.heroFootnoteBadgeText}>Per tutti</Text>
              </View>
              <Text style={styles.heroFootnoteText}>
                Profili “sport”, micro influencer, creator pro e agenzie con più account.
              </Text>
            </View>
          </View>

          {/* CARD ACCESSO */}
          <View style={styles.heroRight}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Accesso</Text>
              <Text style={styles.cardSub}>
                Registrazione rapida oppure login se hai già creato il tuo profilo.
              </Text>

              <View style={styles.tabsRow}>
                <TouchableOpacity
                  style={[
                    styles.tabButton,
                    !currentUser && styles.tabButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.tabText,
                      !currentUser && styles.tabTextActive,
                    ]}
                  >
                    Registrazione
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.tabButton,
                    currentUser && styles.tabButtonInactive,
                  ]}
                >
                  <Text
                    style={[
                      styles.tabText,
                      currentUser && styles.tabTextActive,
                    ]}
                  >
                    Login
                  </Text>
                </TouchableOpacity>
              </View>

              {/* SIGNUP FORM */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldGroupTitle}>Dati account</Text>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Email</Text>
                  <TextInput
                    value={suEmail}
                    onChangeText={setSuEmail}
                    placeholder="tu@email.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={styles.input}
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Password</Text>
                  <TextInput
                    value={suPassword}
                    onChangeText={setSuPassword}
                    placeholder="Minimo 6 caratteri"
                    secureTextEntry
                    style={styles.input}
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldGroupTitle}>Profilo social principale</Text>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Piattaforma (scrivi a mano)</Text>
                  <TextInput
                    value={suPlatform}
                    onChangeText={setSuPlatform}
                    placeholder="instagram / tiktok / youtube / twitch"
                    autoCapitalize="none"
                    style={styles.input}
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Username</Text>
                  <TextInput
                    value={suUsername}
                    onChangeText={setSuUsername}
                    placeholder="@il_tuo_handle"
                    autoCapitalize="none"
                    style={styles.input}
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Follower complessivi</Text>
                  <Text style={styles.fieldHint}>
                    Somma approssimativa tra tutte le piattaforme.
                  </Text>
                  <TextInput
                    value={suFollowers}
                    onChangeText={setSuFollowers}
                    placeholder="Es. 12500"
                    keyboardType="numeric"
                    style={styles.input}
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Profili che gestisci</Text>
                  <Text style={styles.fieldHint}>
                    Per agenzie / team (altrimenti lascia 1).
                  </Text>
                  <TextInput
                    value={suProfiles}
                    onChangeText={setSuProfiles}
                    placeholder="1"
                    keyboardType="numeric"
                    style={styles.input}
                  />
                </View>
              </View>

              <TouchableOpacity style={styles.primaryButton} onPress={handleSignup}>
                <Text style={styles.primaryButtonIcon}>🚀</Text>
                <Text style={styles.primaryButtonText}>
                  Calcola segmento e crea account
                </Text>
              </TouchableOpacity>
              {!!signupStatus && (
                <Text style={styles.statusText}>{signupStatus}</Text>
              )}

              {/* LOGIN SOTTO */}
              <View style={{ marginTop: 16 }}>
                <Text style={styles.fieldGroupTitle}>Hai già un account?</Text>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Email</Text>
                  <TextInput
                    value={liEmail}
                    onChangeText={setLiEmail}
                    placeholder="tu@email.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={styles.input}
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Password</Text>
                  <TextInput
                    value={liPassword}
                    onChangeText={setLiPassword}
                    placeholder="La tua password"
                    secureTextEntry
                    style={styles.input}
                  />
                </View>
                <TouchableOpacity style={styles.secondaryButton} onPress={handleLogin}>
                  <Text style={styles.secondaryButtonIcon}>🔑</Text>
                  <Text style={styles.secondaryButtonText}>Entra nel tuo profilo</Text>
                </TouchableOpacity>
                {!!loginStatus && (
                  <Text style={styles.statusText}>{loginStatus}</Text>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* DASHBOARD */}
        {currentUser && (
          <View style={styles.dashboardSection}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitleText}>
                La tua posizione nel mondo social
              </Text>
              <View style={styles.sectionBadge}>
                <Text style={styles.sectionBadgeText}>
                  {segmentLabelText(currentUser.segment)}
                </Text>
              </View>
            </View>

            <View style={styles.dashGrid}>
              {/* Segmento & piano */}
              <View style={styles.dashCard}>
                <Text style={styles.dashCardTitle}>Segmento & piano consigliato</Text>
                <Text style={styles.dashHighlight}>{currentUser.plan.label}</Text>
                <View style={styles.segmentTag}>
                  <Text style={styles.segmentTagText}>
                    {currentUser.segment.toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.segmentDesc}>{currentUser.plan.description}</Text>
                <View style={styles.priceRow}>
                  <View>
                    <Text style={styles.priceBig}>
                      {formatPrice(currentUser.plan.monthly_price)}
                    </Text>
                    <Text style={styles.pricePeriod}>al mese</Text>
                  </View>
                  <View>
                    <Text style={styles.priceBig}>
                      {formatPrice(currentUser.plan.yearly_price)}
                    </Text>
                    <Text style={styles.pricePeriod}>all&apos;anno</Text>
                  </View>
                </View>
                {!!currentUser.plan.billing_note && (
                  <Text style={styles.priceNote}>{currentUser.plan.billing_note}</Text>
                )}
              </View>

              {/* Dati profilo */}
              <View style={styles.dashCard}>
                <Text style={styles.dashCardTitle}>Dati di base profilo</Text>
                <View style={styles.mediaKit}>
                  <View style={styles.mediaKitRow}>
                    <Text style={styles.mediaKitLabel}>Email</Text>
                    <Text style={styles.mediaKitValue}>{currentUser.email}</Text>
                  </View>
                  <View style={styles.mediaKitRow}>
                    <Text style={styles.mediaKitLabel}>Piattaforma</Text>
                    <Text style={styles.mediaKitValue}>
                      {currentUser.main_platform}
                    </Text>
                  </View>
                  <View style={styles.mediaKitRow}>
                    <Text style={styles.mediaKitLabel}>Username</Text>
                    <Text style={styles.mediaKitValue}>
                      {currentUser.username || '-'}
                    </Text>
                  </View>
                  <View style={styles.mediaKitRow}>
                    <Text style={styles.mediaKitLabel}>Follower complessivi</Text>
                    <Text style={styles.mediaKitValue}>
                      {currentUser.followers.toLocaleString('it-IT')}
                    </Text>
                  </View>
                  <View style={styles.mediaKitRow}>
                    <Text style={styles.mediaKitLabel}>Profili gestiti</Text>
                    <Text style={styles.mediaKitValue}>
                      {currentUser.profiles_count}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.primaryButton, { marginTop: 10 }]}
                  onPress={handleMediaKit}
                >
                  <Text style={styles.primaryButtonIcon}>📄</Text>
                  <Text style={styles.primaryButtonText}>
                    Genera media kit con prezzi suggeriti
                  </Text>
                </TouchableOpacity>
                {!!mediaKitStatus && (
                  <Text style={styles.statusText}>{mediaKitStatus}</Text>
                )}
              </View>
            </View>

            {/* Media kit & prezzi */}
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitleText}>
                Media kit & prezzi suggeriti
              </Text>
              <View style={styles.sectionBadge}>
                <Text style={styles.sectionBadgeText}>Anteprima</Text>
              </View>
            </View>

            <View style={styles.dashCard}>
              {mediaKit ? (
                <>
                  <Text style={styles.dashCardTitle}>
                    Media kit per {mediaKit.username}
                  </Text>
                  <Text style={styles.mediaSubtitle}>
                    Numeri chiave del profilo e prezzi consigliati per i tuoi contenuti.
                  </Text>

                  <View style={styles.mediaKit}>
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
                        {mediaKit.followers.toLocaleString('it-IT')}
                      </Text>
                    </View>
                    <View style={styles.mediaKitRow}>
                      <Text style={styles.mediaKitLabel}>Views post stimate</Text>
                      <Text style={styles.mediaKitValue}>
                        {mediaKit.estimated.post_avg_views.toLocaleString('it-IT')}
                      </Text>
                    </View>
                    <View style={styles.mediaKitRow}>
                      <Text style={styles.mediaKitLabel}>Views stories stimate</Text>
                      <Text style={styles.mediaKitValue}>
                        {mediaKit.estimated.story_avg_views.toLocaleString('it-IT')}
                      </Text>
                    </View>
                    <View style={{ marginTop: 10 }}>
                      <Text style={styles.mediaPriceTitle}>Prezzi suggeriti (EUR)</Text>
                    </View>
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
                      <Text style={styles.mediaKitLabel}>
                        Pacchetto post + 3 stories
                      </Text>
                      <Text style={styles.mediaKitValue}>
                        {formatPrice(
                          mediaKit.suggested_rates_eur.bundle_post_3stories
                        )}
                      </Text>
                    </View>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.dashCardTitle}>
                    Nessun media kit generato.
                  </Text>
                  <Text style={styles.mediaSubtitle}>
                    Dopo aver generato il media kit vedrai qui i numeri chiave e i
                    prezzi suggeriti.
                  </Text>
                </>
              )}
            </View>

            {/* Consigli profilo */}
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitleText}>Consigli per il tuo profilo</Text>
              <View style={styles.sectionBadge}>
                <Text style={styles.sectionBadgeText}>Suggerimenti</Text>
              </View>
            </View>

            <View style={styles.dashCard}>
              <Text style={styles.dashCardTitle}>
                {profileTips?.level || 'Nessun profilo selezionato.'}
              </Text>
              <Text style={styles.mediaSubtitle}>
                {profileTips?.summary ||
                  'Crea o carica un account per vedere suggerimenti personalizzati su come migliorare il profilo.'}
              </Text>
              {profileTips && profileTips.tips && (
                <View style={{ marginTop: 8 }}>
                  {profileTips.tips.map((t, i) => (
                    <Text key={i} style={styles.tipItem}>
                      • {t}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            © ForCreators. Segmenti e prezzi indicativi basati su follower e stime di
            reach.
          </Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    maxWidth: 1100,
    width: '100%',
    alignSelf: 'center',
  },
  hero: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    marginTop: 24,
  },
  heroLeft: {
    flex: 1.25,
    paddingRight: Platform.OS === 'web' ? 16 : 0,
  },
  heroRight: {
    flex: 1,
    marginTop: Platform.OS === 'web' ? 0 : 20,
  },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(15,23,42,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.5)',
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  heroPillDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#ec4899',
    marginRight: 8,
  },
  heroPillText: {
    fontSize: 13,
    color: '#4f46e5',
  },
  heroTitleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -1,
    color: '#0f172a',
    marginRight: 6,
  },
  heroHighlight: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -1,
  },
  heroSubtitle: {
    fontSize: 15,
    color: '#6b7280',
    marginBottom: 18,
  },
  heroSubtitleBold: {
    fontWeight: '600',
    color: '#111827',
  },
  heroBullets: {
    marginBottom: 14,
  },
  heroBullet: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  heroBulletIcon: {
    width: 18,
    height: 18,
    borderRadius: 999,
    backgroundColor: 'rgba(99,102,241,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  heroBulletIconText: {
    fontSize: 11,
    color: '#6366f1',
  },
  heroBulletText: {
    flex: 1,
    fontSize: 13,
    color: '#6b7280',
  },
  heroFootnote: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  heroFootnoteBadge: {
    backgroundColor: '#0f172a',
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginRight: 8,
  },
  heroFootnoteBadgeText: {
    color: '#e5e7eb',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  heroFootnoteText: {
    fontSize: 12,
    color: '#6b7280',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.3)',
    shadowColor: '#0f172a',
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4f46e5',
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 12,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(148,163,184,0.12)',
    borderRadius: 999,
    padding: 3,
    marginBottom: 10,
  },
  tabButton: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 6,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#0f172a',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  tabButtonInactive: {
    backgroundColor: 'transparent',
  },
  tabText: {
    fontSize: 13,
    color: '#6b7280',
  },
  tabTextActive: {
    color: '#4f46e5',
    fontWeight: '600',
  },
  fieldGroup: {
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.45)',
    padding: 12,
    marginBottom: 10,
  },
  fieldGroupTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4f46e5',
    marginBottom: 6,
  },
  field: {
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  fieldHint: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 3,
  },
  input: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 8 : 6,
    fontSize: 13,
    backgroundColor: '#ffffff',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#6366f1',
  },
  primaryButtonIcon: {
    marginRight: 6,
    fontSize: 14,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#6366f1',
    marginTop: 4,
  },
  secondaryButtonIcon: {
    marginRight: 6,
    fontSize: 14,
  },
  secondaryButtonText: {
    color: '#4f46e5',
    fontSize: 13,
    fontWeight: '600',
  },
  statusText: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 4,
  },
  dashboardSection: {
    marginTop: 24,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4f46e5',
    marginRight: 8,
  },
  sectionBadge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.7)',
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  sectionBadgeText: {
    fontSize: 11,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  dashGrid: {
    // SEMPRE colonna, così non buca il layout su web
    flexDirection: 'column',
  },
  dashCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.5)',
    padding: 12,
    marginRight: 0,
    marginBottom: 10,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  dashCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4f46e5',
    marginBottom: 6,
  },
  dashHighlight: {
    fontSize: 17,
    fontWeight: '700',
    color: '#4f46e5',
    marginBottom: 4,
  },
  segmentTag: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.6)',
    marginBottom: 6,
  },
  segmentTagText: {
    fontSize: 11,
    color: '#6b7280',
  },
  segmentDesc: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 10,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  priceBig: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4f46e5',
    marginRight: 12,
  },
  pricePeriod: {
    fontSize: 11,
    color: '#6b7280',
  },
  priceNote: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 4,
  },
  mediaKit: {
    marginTop: 4,
  },
  mediaKitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  mediaKitLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  mediaKitValue: {
    fontSize: 12,
    color: '#111827',
    fontWeight: '500',
  },
  mediaSubtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  mediaPriceTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  tipItem: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  footer: {
    marginTop: 16,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    color: '#6b7280',
    textAlign: 'center',
  },
});
