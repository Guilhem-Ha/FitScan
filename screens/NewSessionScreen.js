import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, ScrollView, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { C, T, R, E } from "../theme";
import { Press, PrimaryButton, SectionLabel } from "../ui/kit";

const LEVELS = [
  { key: "debutant", label: "DÉBUTANT", desc: "Je reprends ou je commence" },
  { key: "intermediaire", label: "INTER", desc: "Je m'entraîne régulièrement" },
  { key: "avance", label: "AVANCÉ", desc: "Je maîtrise les techniques" },
];
const GOALS = [
  { key: "force", label: "FORCE", desc: "Puissance & masse" },
  { key: "cardio", label: "CARDIO", desc: "Endurance & brûler" },
  { key: "mixte", label: "MIXTE", desc: "Équilibre total" },
];
const SPLITS = [
  { key: "full_body", label: "FULL BODY", desc: "Corps entier" },
  { key: "upper", label: "UPPER", desc: "Haut du corps" },
  { key: "lower", label: "LOWER", desc: "Bas du corps" },
];
const DURATIONS = [30, 45, 60, 90];

function OptionRow({ options, selected, onSelect }) {
  return (
    <View style={styles.optRow}>
      {options.map((opt) => {
        const active = selected === opt.key;
        return (
          <Press
            key={opt.key}
            style={[styles.optBtn, active && styles.optBtnActive]}
            onPress={() => onSelect(opt.key)}
            scaleTo={0.95}
          >
            <Text style={[styles.optLabel, active && { color: C.bg }]}>{opt.label}</Text>
            <Text style={[styles.optDesc, active && { color: "rgba(10,10,10,0.7)" }]}>{opt.desc}</Text>
          </Press>
        );
      })}
    </View>
  );
}

export default function NewSessionScreen({ navigation }) {
  const [name, setName] = useState("");
  const [level, setLevel] = useState("intermediaire");
  const [goal, setGoal] = useState("mixte");
  const [split, setSplit] = useState("full_body");
  const [duration, setDuration] = useState(45);
  const [focused, setFocused] = useState(false);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Press style={styles.back} onPress={() => navigation.goBack()} scaleTo={0.92}>
          <Feather name="arrow-left" size={16} color={C.textPrimary} />
          <Text style={styles.backText}>RETOUR</Text>
        </Press>

        <View style={styles.head}>
          <Text style={styles.eyebrow}>ÉTAPE 1 / 3 · CONFIGURE</Text>
          <Text style={styles.title}>TON{"\n"}TRAINING</Text>
        </View>

        <View style={styles.body}>
          <SectionLabel>NOM (OPTIONNEL)</SectionLabel>
          <TextInput
            style={[styles.input, focused && { borderColor: C.accent }]}
            placeholder="Ex: Full body lundi..."
            placeholderTextColor={C.textMuted}
            value={name}
            onChangeText={setName}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            maxLength={40}
          />

          <SectionLabel style={styles.spaced}>NIVEAU</SectionLabel>
          <OptionRow options={LEVELS} selected={level} onSelect={setLevel} />

          <SectionLabel style={styles.spaced}>OBJECTIF</SectionLabel>
          <OptionRow options={GOALS} selected={goal} onSelect={setGoal} />

          <SectionLabel style={styles.spaced}>MUSCLES CIBLÉS</SectionLabel>
          <OptionRow options={SPLITS} selected={split} onSelect={setSplit} />

          <SectionLabel style={styles.spaced}>DURÉE (MIN)</SectionLabel>
          <View style={styles.durRow}>
            {DURATIONS.map((d) => {
              const active = duration === d;
              return (
                <Press
                  key={d}
                  style={[styles.durBtn, active && styles.durBtnActive]}
                  onPress={() => setDuration(d)}
                  scaleTo={0.93}
                >
                  <Text style={[styles.durLabel, active && { color: C.bg }]}>{d}</Text>
                </Press>
              );
            })}
          </View>

          <PrimaryButton
            label="SCANNER MON ÉQUIPEMENT"
            icon="arrow-right"
            style={styles.cta}
            onPress={() =>
              navigation.navigate("Scan", { sessionName: name || "Ma séance", level, goal, split, duration })
            }
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: { paddingBottom: 56 },

  back: {
    flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start",
    marginLeft: 24, marginTop: 16, marginBottom: 24,
    backgroundColor: C.surface, borderRadius: R.pill,
    borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 14, paddingVertical: 9,
  },
  backText: { ...T.label, color: C.textPrimary, fontSize: 10 },

  head: { paddingHorizontal: 24, marginBottom: 28 },
  eyebrow: { ...T.label, color: C.accent, marginBottom: 4 },
  title: { fontFamily: "BebasNeue_400Regular", fontSize: 56, color: C.textPrimary, letterSpacing: 2, lineHeight: 56 },

  body: { paddingHorizontal: 24 },
  spaced: { marginTop: 28 },

  input: {
    backgroundColor: C.surface, borderRadius: R.md,
    borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 16, paddingVertical: 15,
    color: C.textPrimary, fontFamily: "DMSans_400Regular", fontSize: 15,
  },

  optRow: { flexDirection: "row", gap: 10 },
  optBtn: {
    flex: 1, paddingVertical: 14, paddingHorizontal: 8, alignItems: "center",
    backgroundColor: C.surface, borderRadius: R.md,
    borderWidth: 1, borderColor: C.border, ...E.raised,
  },
  optBtnActive: { backgroundColor: C.accent, borderColor: C.accent, ...E.accentGlow },
  optLabel: { fontFamily: "BebasNeue_400Regular", fontSize: 18, color: C.textPrimary, letterSpacing: 0.5 },
  optDesc: { ...T.small, textAlign: "center", fontSize: 10, marginTop: 3, color: C.textMuted },

  durRow: { flexDirection: "row", gap: 10 },
  durBtn: {
    flex: 1, paddingVertical: 14, alignItems: "center",
    backgroundColor: C.surface, borderRadius: R.md,
    borderWidth: 1, borderColor: C.border, ...E.raised,
  },
  durBtnActive: { backgroundColor: C.accent, borderColor: C.accent, ...E.accentGlow },
  durLabel: { fontFamily: "BebasNeue_400Regular", fontSize: 26, color: C.textPrimary },

  cta: { marginTop: 36 },
});
