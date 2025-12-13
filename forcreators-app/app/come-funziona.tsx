// app/come-funziona.tsx
import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import TopBar from './components/TopBar';
import GradientText from './components/GradientText';

const STEPS = [
  {
    title: '1. Inserisci i tuoi dati',
    text: 'Email, piattaforma principale, username, follower complessivi e quanti profili gestisci.',
  },
  {
    title: '2. Il sistema calcola il segmento',
    text: 'In base a follower e profili gestiti vieni classificato come Casual, Emergente, Creator Pro o Top Agenzia.',
  },
  {
    title: '3. Viene definito il piano',
    text: 'Ogni segmento ha un piano dedicato: gratuito, 4,90€, 9,90€ o piano agenzia a più profili.',
  },
  {
    title: '4. Generi il media kit',
    text: 'Con un click ottieni views stimate e prezzi suggeriti per post, stories e pacchetti.',
  },
  {
    title: '5. Applichi i consigli',
    text: 'Per ogni segmento ricevi consigli pratici per sistemare bio, contenuti e posizionamento.',
  },
];

export default function HowItWorksScreen() {
  return (
    <LinearGradient
      colors={['#eef2ff', '#f3f4f6', '#fdf2ff']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <TopBar active="come-funziona" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.main}>
          <View style={styles.pageHeader}>
            <Text style={styles.pageKicker}>Procedura</Text>
            <GradientText style={styles.pageTitle}>
              Come funziona ForCreators
            </GradientText>
            <Text style={styles.pageSubtitle}>
              Pochi dati in ingresso, regole chiare e un risultato finale che puoi usare subito per
              parlare con i brand.
            </Text>
          </View>

          {STEPS.map((step, idx) => (
            <View key={idx} style={styles.step}>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepText}>{step.text}</Text>
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
  step: {
    marginTop: 16,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.5)',
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4f46e5',
    marginBottom: 4,
  },
  stepText: {
    fontSize: 13,
    color: '#4b5563',
  },
});
