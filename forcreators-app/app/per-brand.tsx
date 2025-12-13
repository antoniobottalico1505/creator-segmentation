// app/per-brand.tsx
import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import TopBar from './components/TopBar';
import GradientText from './components/GradientText';

export default function ForBrandsScreen() {
  return (
    <LinearGradient
      colors={['#eef2ff', '#f3f4f6', '#fdf2ff']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <TopBar active="per-brand" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.main}>
          <View style={styles.pageHeader}>
            <Text style={styles.pageKicker}>Per brand & agency</Text>
            <GradientText style={styles.pageTitle}>
              Usa ForCreators come lista prezzi condivisa
            </GradientText>
            <Text style={styles.pageSubtitle}>
              Se gestisci più creator o vuoi una base oggettiva per valutare le proposte, puoi
              usare ForCreators come motore di riferimento per segmenti e listini.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Perché usare ForCreators</Text>
            <View style={styles.bulletBlock}>
              <Text style={styles.bullet}>
                • Eviti discussioni infinite su “quanto valgo” perché il sistema segue regole
                chiare basate su follower e view-rate stimato.
              </Text>
              <Text style={styles.bullet}>
                • Puoi allineare tutti i creator su una fascia di prezzo coerente con i loro numeri.
              </Text>
              <Text style={styles.bullet}>
                • Hai un riferimento unico per listini, briefing e negoziazioni.
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Come funziona lato brand</Text>
            <View style={styles.bulletBlock}>
              <Text style={styles.bullet}>1. Definiamo insieme i segmenti da usare nelle tue campagne.</Text>
              <Text style={styles.bullet}>
                2. Ogni profilo che inserisci riceve un segmento (Casual, Emergente, Pro, Agenzia).
              </Text>
              <Text style={styles.bullet}>
                3. Per ogni profilo ottieni media kit, prezzi suggeriti e consigli sul posizionamento.
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quando ha più senso</Text>
            <View style={styles.bulletBlock}>
              <Text style={styles.bullet}>• Lanci un programma di affiliazione con tanti micro e nano creator.</Text>
              <Text style={styles.bullet}>• Gestisci una campagna con decine di profili diversi.</Text>
              <Text style={styles.bullet}>• Vuoi un criterio uniforme per dire sì o no a un budget proposto.</Text>
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
  section: {
    marginTop: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4f46e5',
    marginBottom: 8,
  },
  bulletBlock: {
    gap: 4,
  },
  bullet: {
    fontSize: 13,
    color: '#4b5563',
    marginBottom: 4,
  },
});
