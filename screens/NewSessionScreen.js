import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C, T } from '../theme';

const LEVELS = [
  { key: 'debutant', label: 'DÉBUTANT', desc: 'Je reprends ou je commence' },
  { key: 'intermediaire', label: 'INTER', desc: "Je m'entraîne régulièrement" },
  { key: 'avance', label: 'AVANCÉ', desc: 'Je maîtrise les techniques' },
];
const GOALS = [
  { key: 'force', label: 'FORCE', desc: 'Puissance & masse' },
  { key: 'cardio', label: 'CARDIO', desc: 'Endurance & brûler' },
  { key: 'mixte', label: 'MIXTE', desc: 'Équilibre total' },
];
const SPLITS = [
  { key: 'full_body', label: 'FULL BODY', desc: 'Corps entier' },
  { key: 'upper', label: 'UPPER', desc: 'Haut du corps' },
  { key: 'lower', label: 'LOWER', desc: 'Bas du corps' },
];
const DURATIONS = [
  { val: 30, label: '30' },
  { val: 45, label: '45' },
  { val: 60, label: '60' },
  { val: 90, label: '90' },
];

export default function NewSessionScreen({ navigation }) {
  const [name, setName] = useState('');
  const [level, setLevel] = useState('intermediaire');
  const [goal, setGoal] = useState('mixte');
  const [split, setSplit] = useState('full_body');
  const [duration, setDuration] = useState(45);

  const OptionRow = ({ options, selected, onSelect }) => (
    <View style={styles.optRow}>
      {options.map((opt) => {
        const active = selected === opt.key;
        return (
          <TouchableOpacity
            key={opt.key}
            style={[styles.optBtn, active && styles.optBtnActive]}
            onPress={() => onSelect(opt.key)}
            activeOpacity={0.8}>
            <Text style={[styles.optLabel, active && styles.optLabelActive]}>
              {opt.label}
            </Text>
            <Text style={[styles.optDesc, active && { color: C.bg }]}>
              {opt.desc}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.back}>
          <Text style={styles.backText}>← RETOUR</Text>
        </TouchableOpacity>

        <Text style={styles.eyebrow}>CONFIGURE</Text>
        <Text style={styles.title}>TON{'\n'}TRAINING</Text>

        <View style={styles.divider} />

        <Text style={styles.sectionLabel}>NOM (OPTIONNEL)</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Full body lundi..."
          placeholderTextColor={C.textMuted}
          value={name}
          onChangeText={setName}
          maxLength={40}
        />

        <Text style={styles.sectionLabel}>NIVEAU</Text>
        <OptionRow options={LEVELS} selected={level} onSelect={setLevel} />

        <Text style={styles.sectionLabel}>OBJECTIF</Text>
        <OptionRow options={GOALS} selected={goal} onSelect={setGoal} />

        <Text style={styles.sectionLabel}>MUSCLES CIBLÉS</Text>
        <OptionRow options={SPLITS} selected={split} onSelect={setSplit} />

        <Text style={styles.sectionLabel}>DURÉE (MIN)</Text>
        <View style={styles.durRow}>
          {DURATIONS.map((d) => {
            const active = duration === d.val;
            return (
              <TouchableOpacity
                key={d.val}
                style={[styles.durBtn, active && styles.durBtnActive]}
                onPress={() => setDuration(d.val)}
                activeOpacity={0.8}>
                <Text style={[styles.durLabel, active && { color: C.bg }]}>
                  {d.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.cta}
          onPress={() =>
            navigation.navigate('Scan', {
              sessionName: name || 'Ma séance',
              level,
              goal,
              split,
              duration,
            })
          }
          activeOpacity={0.85}>
          <Text style={styles.ctaText}>SCANNER MON ÉQUIPEMENT →</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: { paddingBottom: 60 },

  back: { paddingHorizontal: 24, paddingTop: 20, marginBottom: 20 },
  backText: { ...T.label },

  eyebrow: {
    ...T.label,
    color: C.accent,
    paddingHorizontal: 24,
    marginBottom: 4,
  },
  title: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 56,
    color: C.textPrimary,
    letterSpacing: 2,
    lineHeight: 56,
    paddingHorizontal: 24,
    marginBottom: 28,
  },

  divider: {
    height: 1,
    backgroundColor: C.border,
    marginHorizontal: 24,
    marginVertical: 24,
  },
  sectionLabel: { ...T.label, paddingHorizontal: 24, marginBottom: 12 },

  input: {
    backgroundColor: C.surface,
    padding: 16,
    color: C.textPrimary,
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    marginHorizontal: 24,
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },

  optRow: {
    flexDirection: 'row',
    gap: 0,
    marginHorizontal: 24,
    marginBottom: 24,
  },
  optBtn: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
    marginRight: 8,
  },
  optBtnActive: { backgroundColor: C.accent, borderColor: C.accent },
  optLabel: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 18,
    color: C.textSecondary,
    letterSpacing: 0.5,
  },
  optLabelActive: { color: C.bg },
  optDesc: { ...T.small, textAlign: 'center', fontSize: 10, marginTop: 3 },

  durRow: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 24,
    marginBottom: 8,
  },
  durBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  durBtnActive: { backgroundColor: C.accent, borderColor: C.accent },
  durLabel: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 26,
    color: C.textSecondary,
  },

  cta: {
    backgroundColor: C.accent,
    marginHorizontal: 24,
    paddingVertical: 18,
    alignItems: 'center',
  },
  ctaText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 15,
    color: C.bg,
    letterSpacing: 2,
  },
});
