import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TextInput, ScrollView, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getProfile } from "../data/storage";
import { C, T, R, E } from "../theme";
import { Press, PrimaryButton, StepHeader, FooterBar } from "../ui/kit";

const LEVELS = [
  { key: "debutant", label: "DÉBUTANT", desc: "Je commence" },
  { key: "intermediaire", label: "INTER", desc: "Régulièrement" },
  { key: "avance", label: "AVANCÉ", desc: "Je maîtrise" },
];
const GOALS = [
  { key: "force", label: "FORCE" },
  { key: "cardio", label: "CARDIO" },
  { key: "mixte", label: "MIXTE" },
];
const SPLITS = [
  { key: "full_body", label: "FULL BODY" },
  { key: "upper", label: "UPPER" },
  { key: "lower", label: "LOWER" },
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
            style={[styles.optBtn, !opt.desc && styles.optBtnTall, active && styles.optBtnActive]}
            onPress={() => onSelect(opt.key)}
            scaleTo={0.95}
          >
            <Text style={[styles.optLabel, active && { color: C.bg }]}>{opt.label}</Text>
            {opt.desc ? (
              <Text style={[styles.optDesc, active && { color: "rgba(10,10,10,0.7)" }]}>{opt.desc}</Text>
            ) : null}
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

  // Niveau et objectif partent des préférences du profil ; ils restent modifiables ici.
  useEffect(() => {
    getProfile().then((profile) => {
      setLevel(profile.level);
      setGoal(profile.goal);
    });
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <StepHeader step={1} onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>CONFIGURE</Text>
        <Text style={styles.title}>TON TRAINING</Text>

        <Text style={styles.label}>NOM DE LA SÉANCE</Text>
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

        <Text style={styles.label}>NIVEAU</Text>
        <OptionRow options={LEVELS} selected={level} onSelect={setLevel} />

        <Text style={styles.label}>OBJECTIF</Text>
        <OptionRow options={GOALS} selected={goal} onSelect={setGoal} />

        <Text style={styles.label}>MUSCLES CIBLÉS</Text>
        <OptionRow options={SPLITS} selected={split} onSelect={setSplit} />

        <View style={styles.durHead}>
          <Text style={[styles.label, { marginTop: 0, marginBottom: 0 }]}>DURÉE</Text>
          <Text style={styles.durValue}>{duration} MIN</Text>
        </View>
        <View style={styles.durRow}>
          {DURATIONS.map((d) => {
            const active = duration === d;
            return (
              <Press
                key={d}
                style={[styles.durBtn, active && styles.optBtnActive]}
                onPress={() => setDuration(d)}
                scaleTo={0.93}
              >
                <Text style={[styles.durLabel, active && { color: C.bg }]}>{d}</Text>
              </Press>
            );
          })}
        </View>
      </ScrollView>

      <FooterBar>
        <PrimaryButton
          label="SCANNER MON ÉQUIPEMENT"
          icon="arrow-right"
          // Deux appuis rapides empilaient deux fois l'ecran de scan.
          onPress={() => {
            if (!navigation.isFocused()) return;
            navigation.navigate("Scan", { sessionName: name || "Ma séance", level, goal, split, duration });
          }}
        />
      </FooterBar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: { paddingHorizontal: 24, paddingBottom: 120 },

  eyebrow: { ...T.label, color: C.accent, marginBottom: 2 },
  title: { fontFamily: "BebasNeue_400Regular", fontSize: 46, color: C.textPrimary, letterSpacing: 1.5, lineHeight: 48, marginBottom: 6 },

  label: { ...T.label, fontSize: 10, marginTop: 22, marginBottom: 10 },

  input: {
    backgroundColor: C.surface, borderRadius: R.md,
    borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 16, paddingVertical: 15,
    color: C.textPrimary, fontFamily: "DMSans_400Regular", fontSize: 15,
  },

  optRow: { flexDirection: "row", gap: 8 },
  optBtn: {
    flex: 1, paddingVertical: 12, paddingHorizontal: 6, alignItems: "center",
    backgroundColor: C.surface, borderRadius: R.md,
    borderWidth: 1, borderColor: C.border, ...E.raised,
  },
  optBtnTall: { paddingVertical: 15 },
  optBtnActive: { backgroundColor: C.accent, borderColor: C.accent, ...E.accentGlow },
  optLabel: { fontFamily: "BebasNeue_400Regular", fontSize: 19, color: C.textSecondary, letterSpacing: 0.5 },
  optDesc: { ...T.small, textAlign: "center", fontSize: 10, marginTop: 2, color: C.textMuted },

  durHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginTop: 22, marginBottom: 10 },
  durValue: { fontFamily: "BebasNeue_400Regular", fontSize: 22, color: C.accent, letterSpacing: 0.5 },
  durRow: { flexDirection: "row", gap: 8 },
  durBtn: {
    flex: 1, paddingVertical: 14, alignItems: "center",
    backgroundColor: C.surface, borderRadius: R.md,
    borderWidth: 1, borderColor: C.border, ...E.raised,
  },
  durLabel: { fontFamily: "BebasNeue_400Regular", fontSize: 24, color: C.textSecondary },
});
