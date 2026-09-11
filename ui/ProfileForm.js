import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput } from "react-native";
import { C, T, R, E } from "../theme";
import { Press, PrimaryButton } from "./kit";

const LEVELS = [
  { key: "debutant", label: "DÉBUTANT" },
  { key: "intermediaire", label: "INTER" },
  { key: "avance", label: "AVANCÉ" },
];
const GOALS = [
  { key: "force", label: "FORCE" },
  { key: "cardio", label: "CARDIO" },
  { key: "mixte", label: "MIXTE" },
];
const WEEKLY_GOALS = [2, 3, 4, 5, 6];

const PHYSICAL = [
  { key: "age", label: "ÂGE", unit: "ans", min: 10, max: 100 },
  { key: "weightKg", label: "POIDS", unit: "kg", min: 30, max: 300 },
  { key: "heightCm", label: "TAILLE", unit: "cm", min: 100, max: 250 },
];

// Accepte la virgule décimale ; renvoie undefined si la saisie est hors bornes.
function parseMeasure(text, min, max) {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) return null;
  const n = parseFloat(trimmed.replace(",", "."));
  return Number.isFinite(n) && n >= min && n <= max ? Math.round(n * 10) / 10 : undefined;
}

function Segmented({ options, selected, onSelect }) {
  return (
    <View style={styles.segRow}>
      {options.map((opt) => {
        const active = selected === opt.key;
        return (
          <Press
            key={opt.key}
            style={[styles.segBtn, active && styles.segBtnActive]}
            onPress={() => onSelect(opt.key)}
            scaleTo={0.94}
          >
            <Text style={[styles.segLabel, active && { color: C.bg }]}>{opt.label}</Text>
          </Press>
        );
      })}
    </View>
  );
}

/* Formulaire de profil partagé par l'onboarding et l'écran Profil.
   onSubmit reçoit le profil nettoyé ; onSkip est optionnel. */
export default function ProfileForm({ initial, submitLabel, onSubmit, onSkip, skipLabel = "PLUS TARD" }) {
  const [firstName, setFirstName] = useState(initial.firstName || "");
  const [weeklyGoal, setWeeklyGoal] = useState(initial.weeklyGoal);
  const [level, setLevel] = useState(initial.level);
  const [goal, setGoal] = useState(initial.goal);
  const [measures, setMeasures] = useState({
    age: initial.age != null ? String(initial.age) : "",
    weightKg: initial.weightKg != null ? String(initial.weightKg) : "",
    heightCm: initial.heightCm != null ? String(initial.heightCm) : "",
  });
  const [error, setError] = useState(null);

  const submit = () => {
    const parsed = {};
    for (const field of PHYSICAL) {
      const value = parseMeasure(measures[field.key], field.min, field.max);
      if (value === undefined) {
        setError(`${field.label.charAt(0)}${field.label.slice(1).toLowerCase()} : entre ${field.min} et ${field.max} ${field.unit}.`);
        return;
      }
      parsed[field.key] = value;
    }
    setError(null);
    onSubmit({ firstName: firstName.trim(), weeklyGoal, level, goal, ...parsed });
  };

  return (
    <View>
      <Text style={styles.label}>PRÉNOM</Text>
      <TextInput
        style={styles.input}
        placeholder="Ton prénom"
        placeholderTextColor={C.textMuted}
        value={firstName}
        onChangeText={setFirstName}
        maxLength={30}
        autoCapitalize="words"
      />

      <View style={styles.labelRow}>
        <Text style={[styles.label, styles.labelInline]}>OBJECTIF PAR SEMAINE</Text>
        <Text style={styles.labelValue}>{weeklyGoal} SÉANCES</Text>
      </View>
      <View style={styles.segRow}>
        {WEEKLY_GOALS.map((n) => {
          const active = weeklyGoal === n;
          return (
            <Press key={n} style={[styles.goalBtn, active && styles.segBtnActive]} onPress={() => setWeeklyGoal(n)} scaleTo={0.92}>
              <Text style={[styles.goalLabel, active && { color: C.bg }]}>{n}</Text>
            </Press>
          );
        })}
      </View>

      <Text style={styles.label}>NIVEAU</Text>
      <Segmented options={LEVELS} selected={level} onSelect={setLevel} />

      <Text style={styles.label}>OBJECTIF PRINCIPAL</Text>
      <Segmented options={GOALS} selected={goal} onSelect={setGoal} />

      <Text style={styles.label}>DONNÉES PHYSIQUES · OPTIONNEL</Text>
      <View style={styles.measureRow}>
        {PHYSICAL.map((field) => (
          <View key={field.key} style={styles.measure}>
            <Text style={styles.measureLabel}>{field.label}</Text>
            <View style={styles.measureInputRow}>
              <TextInput
                style={styles.measureInput}
                placeholder="—"
                placeholderTextColor={C.textMuted}
                keyboardType="decimal-pad"
                value={measures[field.key]}
                onChangeText={(t) => setMeasures((m) => ({ ...m, [field.key]: t }))}
                maxLength={5}
              />
              <Text style={styles.measureUnit}>{field.unit}</Text>
            </View>
          </View>
        ))}
      </View>
      <Text style={styles.note}>Envoyées à l'IA pour adapter les séances générées.</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <PrimaryButton label={submitLabel} onPress={submit} style={styles.submit} />
      {onSkip ? (
        <Press style={styles.skip} onPress={onSkip} scaleTo={0.96}>
          <Text style={styles.skipText}>{skipLabel}</Text>
        </Press>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { ...T.label, fontSize: 10, marginTop: 22, marginBottom: 10 },
  labelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginTop: 22, marginBottom: 10 },
  labelInline: { marginTop: 0, marginBottom: 0 },
  labelValue: { fontFamily: "BebasNeue_400Regular", fontSize: 20, color: C.accent, letterSpacing: 0.5 },

  input: {
    backgroundColor: C.surface, borderRadius: R.md,
    borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 16, paddingVertical: 14,
    color: C.textPrimary, fontFamily: "DMSans_400Regular", fontSize: 15,
  },

  segRow: { flexDirection: "row", gap: 8 },
  segBtn: {
    flex: 1, paddingVertical: 14, alignItems: "center",
    backgroundColor: C.surface, borderRadius: R.md,
    borderWidth: 1, borderColor: C.border, ...E.raised,
  },
  segBtnActive: { backgroundColor: C.accent, borderColor: C.accent, ...E.accentGlow },
  segLabel: { fontFamily: "BebasNeue_400Regular", fontSize: 18, color: C.textSecondary, letterSpacing: 0.5 },
  goalBtn: {
    flex: 1, paddingVertical: 12, alignItems: "center",
    backgroundColor: C.surface, borderRadius: R.md,
    borderWidth: 1, borderColor: C.border, ...E.raised,
  },
  goalLabel: { fontFamily: "BebasNeue_400Regular", fontSize: 22, color: C.textSecondary },

  measureRow: { flexDirection: "row", gap: 8 },
  measure: {
    flex: 1, backgroundColor: C.surface, borderRadius: R.md,
    borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  measureLabel: { ...T.label, fontSize: 9, color: C.textMuted },
  measureInputRow: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  measureInput: {
    flex: 1, paddingVertical: 2,
    color: C.textPrimary, fontFamily: "DMSans_700Bold", fontSize: 20,
  },
  measureUnit: { fontFamily: "DMSans_400Regular", fontSize: 12, color: C.textMuted },
  note: { ...T.small, fontSize: 11, color: C.textMuted, marginTop: 8 },

  error: { fontFamily: "DMSans_600SemiBold", fontSize: 13, color: C.red, marginTop: 16 },
  submit: { marginTop: 28 },
  skip: { alignSelf: "center", paddingVertical: 14, paddingHorizontal: 20, marginTop: 4 },
  skipText: { fontFamily: "DMSans_700Bold", fontSize: 12, color: C.textSecondary, letterSpacing: 1.5 },
});
