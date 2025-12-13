// app/contatti.tsx
import React, { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TextInput, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import TopBar from './components/TopBar';
import GradientText from './components/GradientText';

const API_BASE = 'https://forcreators.vip';

export default function ContactScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<string>('');

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      setStatus('Compila tutti i campi.');
      return;
    }
    setStatus('Invio del messaggio in corso...');

    try {
      const res = await fetch(`${API_BASE}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          subject: subject.trim(),
          message: message.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({} as any));
        setStatus(data.detail || 'Errore durante l’invio del messaggio.');
        return;
      }
      setStatus('Messaggio inviato, ti risponderemo via email.');
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    } catch (e) {
      setStatus('Errore di rete, riprova più tardi.');
    }
  };

  return (
    <LinearGradient
      colors={['#eef2ff', '#f3f4f6', '#fdf2ff']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <TopBar active="contatti" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.main}>
          <View style={styles.pageHeader}>
            <GradientText style={styles.pageTitle}>Contatti</GradientText>
            <Text style={styles.pageSubtitle}>
              Scrivici per partnership, idee, supporto o per usare ForCreators su un numero elevato
              di profili.
            </Text>
          </View>

          <View style={styles.grid}>
            {/* FORM */}
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Mandaci un messaggio</Text>
              <Text style={styles.formSubtitle}>
                Compila il modulo qui sotto, ti risponderemo all’indirizzo email indicato.
              </Text>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Nome</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Il tuo nome"
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="tu@email.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Oggetto</Text>
                <TextInput
                  style={styles.input}
                  value={subject}
                  onChangeText={setSubject}
                  placeholder="Es. partnership, supporto..."
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Messaggio</Text>
                <TextInput
                  style={[styles.input, styles.textarea]}
                  value={message}
                  onChangeText={setMessage}
                  placeholder="Scrivi qui il tuo messaggio"
                  multiline
                />
              </View>

              <Pressable style={styles.button} onPress={handleSubmit}>
                <Text style={styles.buttonText}>Invia messaggio</Text>
              </Pressable>
              {!!status && <Text style={styles.statusText}>{status}</Text>}
            </View>

            {/* INFO LATERALI */}
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>Per chi è ForCreators</Text>
              <View style={styles.infoBlock}>
                <Text style={styles.infoHeading}>Creator & influencer</Text>
                <Text style={styles.infoText}>
                  ti aiutiamo a capire quanto chiedere ai brand in base ai tuoi numeri reali.
                </Text>
              </View>
              <View style={styles.infoBlock}>
                <Text style={styles.infoHeading}>Agenzie & network</Text>
                <Text style={styles.infoText}>
                  puoi usare ForCreators come base comune per listini e campagne con più profili.
                </Text>
              </View>
              <View style={styles.infoBlock}>
                <Text style={styles.infoHeading}>Brand & ecommerce</Text>
                <Text style={styles.infoText}>
                  se vuoi usare ForCreators come strumento interno di valutazione, scrivici e
                  studieremo una configurazione ad hoc.
                </Text>
              </View>
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 8,
  },
  formCard: {
    flex: 1.2,
    minWidth: 260,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.5)',
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  infoCard: {
    flex: 1,
    minWidth: 220,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.5)',
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4f46e5',
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 10,
  },
  field: {
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#0f172a',
    marginBottom: 3,
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 13,
    backgroundColor: '#ffffff',
  },
  textarea: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  button: {
    marginTop: 6,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  statusText: {
    marginTop: 6,
    fontSize: 12,
    color: '#6b7280',
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4f46e5',
    marginBottom: 8,
  },
  infoBlock: {
    marginBottom: 8,
  },
  infoHeading: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  infoText: {
    fontSize: 13,
    color: '#4b5563',
  },
});
