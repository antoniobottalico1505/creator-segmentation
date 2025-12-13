// app/faq.tsx
import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import TopBar from './components/TopBar';
import GradientText from './components/GradientText';

const FAQ_ITEMS = [
  {
    q: 'Che cos’è ForCreators?',
    a: 'È uno strumento che ti aiuta a capire in che segmento rientri (da profilo “sport” a creator pro / agenzia) e quali prezzi ha senso chiedere ai brand.',
  },
  {
    q: 'Su quali piattaforme funziona?',
    a: 'Puoi usarlo se lavori su Instagram, TikTok, YouTube, Twitch o altre piattaforme simili. Inserisci la piattaforma principale e il totale follower stimato.',
  },
  {
    q: 'Come calcolate i prezzi suggeriti?',
    a: 'Partiamo dai follower e da una view-rate media per segmento, poi applichiamo un valore medio per 1.000 follower per arrivare a un prezzo indicativo per post, story e bundle.',
  },
  {
    q: 'Posso usare ForCreators se gestisco più profili?',
    a: 'Sì. Se gestisci più account (es. agenzia o network) il sistema ti mette nella fascia “Top Agenzia” con un piano dedicato a multi-profilo.',
  },
  {
    q: 'I prezzi sono vincolanti?',
    a: 'No. Sono indicativi e ti servono come base di partenza per negoziare. Puoi alzare o abbassare in base a nicchia, risultati reali e complessità delle campagne.',
  },
  {
    q: 'Posso usare ForCreators internamente come brand?',
    a: 'Sì. Puoi usarlo come motore di riferimento per valutare le proposte dei creator e avere una base comune di listino per campagne e collaborazioni.',
  },
];

export default function FAQScreen() {
  return (
    <LinearGradient
      colors={['#eef2ff', '#f3f4f6', '#fdf2ff']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <TopBar active="faq" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.main}>
          <View style={styles.pageHeader}>
            <GradientText style={styles.pageTitle}>FAQ</GradientText>
            <Text style={styles.pageSubtitle}>
              Le risposte alle domande più frequenti su come usare ForCreators.
            </Text>
          </View>

          {FAQ_ITEMS.map((item, idx) => (
            <View key={idx} style={styles.item}>
              <Text style={styles.question}>{item.q}</Text>
              <Text style={styles.answer}>{item.a}</Text>
            </View>
          ))}
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
  item: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.4)',
  },
  question: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  answer: {
    fontSize: 13,
    color: '#4b5563',
  },
});
