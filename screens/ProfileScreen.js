import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { getProfile, saveProfile, getSessions, sessionMinutes } from "../data/storage";
import { formatDuration, streakDays } from "../data/stats";
import { C, T, R, E } from "../theme";
import { BackButton } from "../ui/kit";
import ProfileForm from "../ui/ProfileForm";

export default function ProfileScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    getProfile().then(setProfile);
    getSessions().then(setSessions);
  }, []);

  const handleSubmit = async (next) => {
    try {
      await saveProfile(next);
      setProfile(next);
      setStatus("saved");
      setTimeout(() => setStatus(null), 2000);
    } catch {
      setStatus("error");
    }
  };

  const totalMinutes = sessions.reduce((a, s) => a + sessionMinutes(s), 0);
  const name = profile?.firstName;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>PROFIL</Text>
      </View>

      {profile && (
        <KeyboardAwareScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          enableOnAndroid
          extraScrollHeight={80}
        >
          <View style={styles.identity}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{name ? name.charAt(0).toUpperCase() : "?"}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>{name ? name.toUpperCase() : "SANS PRÉNOM"}</Text>
              <Text style={styles.goalLine}>Objectif : {profile.weeklyGoal} séances par semaine</Text>
            </View>
          </View>

          <View style={styles.tiles}>
            {[
              [sessions.length, "Séances"],
              [formatDuration(totalMinutes), "Entraînement"],
              [`${streakDays(sessions)} J`, "Série"],
            ].map(([value, label]) => (
              <View key={label} style={styles.tile}>
                <Text style={styles.tileValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
                <Text style={styles.tileLabel}>{label}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.sectionTitle}>MES INFOS</Text>
          <ProfileForm
            initial={profile}
            submitLabel={status === "saved" ? "ENREGISTRÉ" : "ENREGISTRER"}
            onSubmit={handleSubmit}
          />
          {status === "error" ? <Text style={styles.error}>Impossible d'enregistrer le profil.</Text> : null}
        </KeyboardAwareScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 12 },
  headerTitle: { fontFamily: "BebasNeue_400Regular", fontSize: 28, color: C.textPrimary, letterSpacing: 1 },
  container: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 48 },

  identity: {
    flexDirection: "row", alignItems: "center", gap: 16,
    backgroundColor: C.surface, borderRadius: R.lg,
    borderWidth: 1, borderColor: C.border,
    padding: 16, ...E.raised,
  },
  avatar: {
    width: 60, height: 60, borderRadius: 20,
    alignItems: "center", justifyContent: "center",
    backgroundColor: C.accent, ...E.accentGlow,
  },
  avatarText: { fontFamily: "BebasNeue_400Regular", fontSize: 34, color: C.bg, lineHeight: 38 },
  name: { fontFamily: "BebasNeue_400Regular", fontSize: 30, color: C.textPrimary, letterSpacing: 1, lineHeight: 32 },
  goalLine: { ...T.small, color: C.textSecondary, marginTop: 2 },

  tiles: { flexDirection: "row", gap: 8, marginTop: 12 },
  tile: {
    flex: 1, paddingVertical: 14, paddingHorizontal: 12,
    backgroundColor: C.surface, borderRadius: R.md,
    borderWidth: 1, borderColor: C.border,
  },
  tileValue: { fontFamily: "BebasNeue_400Regular", fontSize: 28, color: C.accent, lineHeight: 30 },
  tileLabel: { ...T.small, fontSize: 11, color: C.textMuted },

  sectionTitle: { ...T.label, color: C.textPrimary, marginTop: 28, marginBottom: -8 },
  error: { fontFamily: "DMSans_600SemiBold", fontSize: 13, color: C.red, marginTop: 12, textAlign: "center" },
});
