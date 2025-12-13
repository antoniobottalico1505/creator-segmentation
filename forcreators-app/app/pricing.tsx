// app/pricing.tsx
import React from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import TopBar from './components/TopBar';
import GradientText from './components/GradientText';

export default function PricingScreen() {
  return (
    <LinearGradient
      colors={['#eef2ff', '#f3f4f6', '#fdf2ff']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <TopBar active="pricing" />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.main}>
          <View style={styles.pageHeader}>
            <Text style={styles.pageKicker}>Listino</Text>
            <GradientText style={styles.pageTitle}>
              Pricing ForCreators
            </GradientText>
            <Text style={styles.pageSubtitle}>
              I prezzi sono pensati per segmentare in modo chiaro: profilo “sport”, emergente,
              creator pro e agenzia con più profili.
            </Text>
          </View>

          <View style={styles.pricingGrid}>
            {/* CASUAL */}
            <View style={[styles.card, styles.cardFree]}>
              <Text style={styles.cardTag}>Sotto 2.000 follower</Text>
              <Text style={styles.cardTitle}>Casual – profilo “sport”</Text>
              <Text style={styles.cardSubtitle}>
                Per chi usa i social per sport e vuole una base minima per le prime collaborazioni.
              </Text>
              <View style={styles.priceBlock}>
                <Text style={styles.priceValue}>0 €</Text>
                <Text style={styles.pricePeriod}>/mese</Text>
              </View>
              <Text style={styles.priceNote}>
                Gratis per profili sotto i 2.000 follower.
              </Text>
              <View style={styles.bullets}>
                <Text style={styles.bullet}>• Accesso alla dashboard</Text>
                <Text style={styles.bullet}>• Segmento calcolato automaticamente</Text>
                <Text style={styles.bullet}>• Media kit base con prezzi consigliati</Text>
              </View>
            </View>

            {/* EMERGENTE */}
            <View style={styles.card}>
              <Text style={styles.cardTag}>Da 2.000 a 10.000 follower</Text>
              <Text style={styles.cardTitle}>Emergente – primi brand</Text>
              <Text style={styles.cardSubtitle}>
                Per chi inizia a ricevere proposte e vuole una struttura prezzi sensata.
              </Text>
              <View style={styles.priceBlock}>
                <Text style={styles.priceValue}>4,90 €</Text>
                <Text style={styles.pricePeriod}>/mese</Text>
              </View>
              <Text style={styles.priceNote}>
                Oppure 49 € all&apos;anno (circa 2 mesi gratis rispetto al mensile).
              </Text>
              <View style={styles.bullets}>
                <Text style={styles.bullet}>• Media kit con prezzi suggeriti per formato</Text>
                <Text style={styles.bullet}>• Range di views stimati</Text>
                <Text style={styles.bullet}>• Suggerimenti per sistemare il profilo</Text>
              </View>

              {/* EMERGENTE – mensile */}
              <TouchableOpacity
                style={[styles.primaryButton, { marginTop: 8 }]}
                onPress={() =>
                  Linking.openURL('https://buy.stripe.com/aFa5kEgDbgtp6hq56i4gg00')
                }
              >
                <Text style={styles.primaryButtonText}>Attiva piano mensile</Text>
              </TouchableOpacity>

              {/* EMERGENTE – annuale */}
              <TouchableOpacity
                style={[styles.primaryButton, { marginTop: 6 }]}
                onPress={() =>
                  Linking.openURL('https://buy.stripe.com/dRmbJ22Ml5OL9tC6am4gg06')
                }
              >
                <Text style={styles.primaryButtonText}>
                  Attiva piano annuale (2 mesi gratis)
                </Text>
              </TouchableOpacity>
            </View>

            {/* PRO */}
            <View style={styles.card}>
              <Text style={styles.cardTag}>Da 10.000 a 200.000 follower</Text>
              <Text style={styles.cardTitle}>Creator Pro – collaborazioni strutturate</Text>
              <Text style={styles.cardSubtitle}>
                Per chi lavora con più brand e vuole un listino chiaro, aggiornato e difendibile.
              </Text>
              <View style={styles.priceBlock}>
                <Text style={styles.priceValue}>9,90 €</Text>
                <Text style={styles.pricePeriod}>/mese</Text>
              </View>
              <Text style={styles.priceNote}>Oppure 99 € all&apos;anno.</Text>
              <View style={styles.bullets}>
                <Text style={styles.bullet}>• Media kit completo</Text>
                <Text style={styles.bullet}>• Suggerimenti avanzati per il profilo</Text>
                <Text style={styles.bullet}>• Supporto a più piattaforme</Text>
              </View>

              {/* PRO – mensile */}
              <TouchableOpacity
                style={[styles.primaryButton, { marginTop: 8 }]}
                onPress={() =>
                  Linking.openURL('https://buy.stripe.com/cNi28s9aJ5OL9tC0Q24gg01')
                }
              >
                <Text style={styles.primaryButtonText}>Attiva piano mensile</Text>
              </TouchableOpacity>

              {/* PRO – annuale */}
              <TouchableOpacity
                style={[styles.primaryButton, { marginTop: 6 }]}
                onPress={() =>
                  Linking.openURL('https://buy.stripe.com/cNiaEYdqZ4KHdJS42e4gg07')
                }
              >
                <Text style={styles.primaryButtonText}>
                  Attiva piano annuale (2 mesi gratis)
                </Text>
              </TouchableOpacity>
            </View>

            {/* AGENZIA */}
            <View style={styles.card}>
              <Text style={styles.cardTag}>Più profili gestiti</Text>
              <Text style={styles.cardTitle}>Top Agenzia – multi profilo</Text>
              <Text style={styles.cardSubtitle}>
                Per agenzie, network e team che gestiscono più profili e vogliono un listino
                condiviso tra tutti.
              </Text>
              <View style={styles.bullets}>
                <Text style={styles.bullet}>• Fino a 2 profili: 99 €/mese</Text>
                <Text style={styles.bullet}>• Fino a 3 profili: 199 €/mese</Text>
                <Text style={styles.bullet}>• Fino a 4 profili: 299 €/mese</Text>
                <Text style={styles.bullet}>• Da 5 profili in su: 399 €/mese</Text>
              </View>

              <View style={{ marginTop: 10 }}>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() =>
                    Linking.openURL('https://buy.stripe.com/3cI4gAfz7cd9dJS8iu4gg02')
                  }
                >
                  <Text style={styles.primaryButtonText}>
                    Agenzia S · fino a 2 profili (99€/mese)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.primaryButton, { marginTop: 6 }]}
                  onPress={() =>
                    Linking.openURL('https://buy.stripe.com/7sYfZi2Ml1yvaxG56i4gg03')
                  }
                >
                  <Text style={styles.primaryButtonText}>
                    Agenzia M · fino a 3 profili (199€/mese)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.primaryButton, { marginTop: 6 }]}
                  onPress={() =>
                    Linking.openURL('https://buy.stripe.com/3cI4gA1Ih4KH35egP04gg04')
                  }
                >
                  <Text style={styles.primaryButtonText}>
                    Agenzia L · fino a 4 profili (299€/mese)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.primaryButton, { marginTop: 6 }]}
                  onPress={() =>
                    Linking.openURL('https://buy.stripe.com/bJecN6biR90XgW4cyK4gg05')
                  }
                >
                  <Text style={styles.primaryButtonText}>
                    Agenzia XL · 5+ profili (399€/mese)
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.priceNote, { marginTop: 8 }]}>
                Perfetto come base unica per listini e campagne con più creator.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
  },
  main: {
    maxWidth: 1100,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  pageHeader: {
    marginTop: 24,
    marginBottom: 16,
  },
  pageKicker: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#6b7280',
    marginBottom: 4,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -1,
    marginBottom: 6,
  },
  pageSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    maxWidth: 520,
  },
  pricingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    // niente gap: gestiamo con i margini sulle card
  },
  card: {
    flex: 1,
    minWidth: 250,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.5)',
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    marginRight: 12,
    marginBottom: 12,
  },
  cardFree: {
    borderColor: 'rgba(34,197,94,0.5)',
  },
  cardTag: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4f46e5',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 8,
  },
  priceBlock: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4f46e5',
    marginRight: 4,
  },
  pricePeriod: {
    fontSize: 13,
    color: '#6b7280',
  },
  priceNote: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    marginBottom: 8,
  },
  bullets: {
    marginTop: 4,
  },
  bullet: {
    fontSize: 12,
    color: '#4b5563',
    marginBottom: 2,
  },
  primaryButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#6366f1',
    shadowColor: '#6366f1',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
});
