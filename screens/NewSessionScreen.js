import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { C, T, R, E } from "../theme";
import { Press, PrimaryButton, SectionLabel, IconBadge } from "../ui/kit";

const LEVELS = [
  { key: "debutant", label: "DÉBUTANT", desc: "Je reprends" },
  { key: "intermediaire", label: "INTER", desc: "Régulier" },
  { key: "avance", label: "AVANCÉ", desc: "Je maîtrise" },
];
const GOALS = [
  { key: "force", label: "FORCE", desc: "Puissance & masse" },
  { key: "cardio", label: "CARDIO", desc: "Endurance" },
  { key: "mixte", label: "MIXTE", desc: "Équilibre" },
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
            <Text style={[styles.optLabel, active && { color: C.accent }]}>{opt.label}</Text>
            <Text style={[styles.optDesc, active && { color: C.textSecondary }]}>{opt.desc}</Text>
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

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Press style={styles.back} onPress={() => navigation.goBack()} scaleTo={0.94}>
          <Feather name="chevron-left" size={16} color={C.textSecondary} />
          <Text style={styles.backText}>RETOUR</Text>
        </Press>

        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>ÉTAPE 1 / 3</Text>
            <Text style={styles.title}>TON{"\n"}TRAINING</Text>
          </View>
          <IconBadge name="sliders" size={46} />
        </View>

        <View style={styles.body}>
          <SectionLabel>NOM (OPTIONNEL)</SectionLabel>
          <View style={styles.inputWrap}>
            <Feather name="edit-3" size={15} color={C.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="Ex: Full body lundi..."
              placeholderTextColor={C.textMuted}
              value={name}
              onChangeText={setName}
              maxLength={40}
            />
          </View>

          <SectionLabel style={styles.sectionSpaced}>NIVEAU</SectionLabel>
          <OptionRow options={LEVELS} selected={level} onSelect={setLevel} />

          <SectionLabel style={styles.sectionSpaced}>OBJECTIF</SectionLabel>
          <OptionRow options={GOALS} selected={goal} onSelect={setGoal} />

          <SectionLabel style={styles.sectionSpaced}>MUSCLES CIBLÉS</SectionLabel>
          <OptionRow options={SPLITS} selected={split} onSelect={setSplit} />

          <SectionLabel style={styles.sectionSpaced}>DURÉE (MIN)</SectionLabel>
          <View style={styles.durRow}>
            {DURATIONS.map((val) => {
              const active = duration === val;
              return (
                <Press
                  key={val}
                  style={[styles.durBtn, active && styles.optBtnActive]}
                  onPress={() => setDuration(val)}
                  scaleTo={0.92}
                >
                  <Text style={[styles.durLabel, active && { color: C.accent }]}>{val}</Text>
                </Press>
              );
            })}
          </View>

          <PrimaryButton
            label="SCANNER MON ÉQUIPEMENT"
            icon="camera"
            style={styles.cta}
            onPress={() =>
              navigation.navigate("Scan", {
                sessionName: name || "Ma séance",
                level,
                goal,
                split,
                duration,
              })
            }
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: { paddingBottom: 48 },

  back: {
    flexDirection: "row", alignItems: "center", gap: 6,
    alignSelf: "flex-start", marginLeft: 24, marginTop: 16, marginBottom: 12,
    paddingVertical: 8, paddingHorizontal: 12,
    backgroundColor: C.surface, borderRadius: R.pill,
    borderWidth: 1, borderColor: C.border,
  },
  backText: { ...T.label, fontSize: 10 },

  header: { flexDirection: "row", alignItems: "center", gap: 16, paddingHorizontal: 24, paddingBottom: 28 },
  eyebrow: { ...T.label, color: C.accent, marginBottom: 4 },
  title: { fontFamily: "BebasNeue_400Regular", fontSize: 52, color: C.textPrimary, letterSpacing: 2, lineHeight: 52 },

  body: { paddingHorizontal: 24 },
  sectionSpaced: { marginTop: 28 },

  inputWrap: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: C.surface, borderRadius: R.md,
    borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1, paddingVertical: 15,
    color: C.textPrimary, fontFamily: "DMSans_400Regular", fontSize: 15,
  },

  optRow: { flexDirection: "row", gap: 8 },
  optBtn: {
    flex: 1, alignItems: "center", gap: 3,
    paddingVertical: 14, paddingHorizontal: 6,
    backgroundColor: C.surface, borderRadius: R.md,
    borderWidth: 1, borderColor: C.border,
  },
  optBtnActive: { backgroundColor: C.accentSoft, borderColor: C.accent, ...E.raised },
  optLabel: { fontFamily: "BebasNeue_400Regular", fontSize: 19, color: C.textPrimary, letterSpacing: 0.5 },
  optDesc: { ...T.small, fontSize: 10, color: C.textMuted, textAlign: "center" },

  durRow: { flexDirection: "row", gap: 8 },
  durBtn: {
    flex: 1, alignItems: "center", paddingVertical: 15,
    backgroundColor: C.surface, borderRadius: R.md,
    borderWidth: 1, borderColor: C.border,
  },
  durLabel: { fontFamily: "BebasNeue_400Regular", fontSize: 26, color: C.textPrimary },

  cta: { marginTop: 36 },
});
