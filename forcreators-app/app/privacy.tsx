import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import TopBar from './components/TopBar';
import GradientText from './components/GradientText';

export default function PrivacyScreen() {
  return (
    <LinearGradient
      colors={['#eef2ff', '#f3f4f6', '#fdf2ff']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <TopBar active="privacy" />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.main}>
          <View style={styles.header}>
            <Text style={styles.kicker}>Informativa</Text>
            <GradientText style={styles.title}>Privacy Policy</GradientText>
            <Text style={styles.subtitle}>
              Questa informativa descrive come ForCreators tratta i dati personali su app e sito.
              {'\n'}
              Ultimo aggiornamento: 13/12/2025
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.h2}>1) Titolare del trattamento</Text>
            <Text style={styles.p}>
              ForCreators. Contatto privacy: we20trust25@gmail.com
            </Text>
            <Text style={styles.muted}>
              Sostituisci con la tua email reale (es. support@forcreators.vip).
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.h2}>2) Dati che raccogliamo</Text>
            <Text style={styles.p}>• Dati account: email, password (gestita in modo sicuro lato server), username.</Text>
            <Text style={styles.p}>• Dati profilo: piattaforma principale, follower, profili gestiti.</Text>
            <Text style={styles.p}>• Dati d’uso: azioni nell’app (es. generazione media kit) e log tecnici essenziali.</Text>
            <Text style={styles.p}>• Contatti: nome/email/messaggio se ci scrivi.</Text>
            <Text style={styles.p}>• Pagamenti: non memorizziamo i dati della carta (gestiti dai provider).</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.h2}>3) Perché li usiamo</Text>
            <Text style={styles.p}>• Creare e gestire l’account.</Text>
            <Text style={styles.p}>• Calcolare segmentazione e mostrare prezzi/suggerimenti indicativi.</Text>
            <Text style={styles.p}>• Gestire abbonamenti e sbloccare funzioni premium (se previste).</Text>
            <Text style={styles.p}>• Assistenza e messaggi dal form contatti.</Text>
            <Text style={styles.p}>• Sicurezza e prevenzione abusi.</Text>
            <Text style={styles.muted}>
              Nota: prezzi e suggerimenti sono indicativi/consulenziali e non costituiscono garanzia.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.h2}>4) Base giuridica</Text>
            <Text style={styles.p}>• Esecuzione del servizio richiesto (account, funzioni, supporto).</Text>
            <Text style={styles.p}>• Consenso (solo dove richiesto, es. marketing/newsletter se mai attivati).</Text>
            <Text style={styles.p}>• Legittimo interesse (sicurezza, prevenzione frodi/abusi).</Text>
            <Text style={styles.p}>• Obblighi di legge dove applicabili.</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.h2}>5) Pagamenti e abbonamenti</Text>
            <Text style={styles.p}>• Web: pagamenti gestiti da Stripe (nessun dato carta salvato da noi).</Text>
            <Text style={styles.p}>
              • App: per sblocchi digitali, in genere Apple/Google richiedono In-App Purchase (o servizi come RevenueCat).
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.h2}>6) Conservazione</Text>
            <Text style={styles.p}>• Dati account: finché l’account resta attivo o fino a richiesta di cancellazione.</Text>
            <Text style={styles.p}>• Dati contatti: tempo necessario a gestire la richiesta.</Text>
            <Text style={styles.p}>• Log: solo quanto serve per sicurezza e diagnosi.</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.h2}>7) Diritti</Text>
            <Text style={styles.p}>
              Puoi chiedere accesso, rettifica, cancellazione, limitazione, portabilità e opposizione.
              Contatto: we20trust25@gmail.com
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.h2}>8) Modifiche</Text>
            <Text style={styles.p}>
              Potremmo aggiornare questa informativa. La data “ultimo aggiornamento” indica l’ultima modifica.
            </Text>
          </View>

          <Text style={styles.footerNote}>© ForCreators · Privacy Policy</Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1 },
  main: {
    maxWidth: 1100,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  header: { marginTop: 24, marginBottom: 16 },
  kicker: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#6b7280',
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -1,
    marginBottom: 6,
  },
  subtitle: { fontSize: 14, color: '#6b7280', maxWidth: 560 },
  card: {
    borderRadius: 16,
    backgroundColor: '#ffffff',
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.5)',
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    marginBottom: 12,
  },
  h2: { fontSize: 15, fontWeight: '800', color: '#4f46e5', marginBottom: 6 },
  p: { fontSize: 13, color: '#0f172a', lineHeight: 18, marginBottom: 6 },
  muted: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  footerNote: { marginTop: 8, fontSize: 12, color: '#6b7280', textAlign: 'center' },
});
