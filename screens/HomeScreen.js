import React, { useState, useRef, useCallback } from "react";
import { useScreenRefresh } from "../hooks/useScreenRefresh";
import { View, Text, StyleSheet, FlatList, StatusBar, Animated, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { getSessions, deleteSession, sessionMinutes, getProfile, DEFAULT_PROFILE } from "../data/storage";
import { streakDays, weekSessions } from "../data/stats";
import { C, T, R, E } from "../theme";
import { Press, PrimaryButton, Ring } from "../ui/kit";

const GOAL_LABELS = { force: "FORCE", cardio: "CARDIO", mixte: "MIXTE" };
const LEVEL_LABELS = { debutant: "DÉBUTANT", intermediaire: "INTER", avance: "AVANCÉ" };
const INK = C.bg;
const INK_SOFT = "rgba(10,10,10,0.2)";

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }).toUpperCase();
}

function StreakCard({ sessions, weeklyGoal }) {
  const streak = streakDays(sessions);
  const week = weekSessions(sessions);
  const remaining = Math.max(0, weeklyGoal - week.length);

  return (
    <View style={styles.hero}>
      <View style={styles.heroTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroEyebrow}>SÉRIE EN COURS</Text>
          <Text style={styles.heroValue}>{streak} JOUR{streak > 1 ? "S" : ""}</Text>
          <Text style={styles.heroSub}>
            {remaining === 0
              ? "Objectif de la semaine atteint"
              : `Encore ${remaining} séance${remaining > 1 ? "s" : ""} cette semaine`}
          </Text>
        </View>
        <Ring size={62} stroke={5} value={week.length / weeklyGoal} color={INK} trackColor={INK_SOFT}>
          <Text style={styles.heroRingText}>{week.length}/{weeklyGoal}</Text>
        </Ring>
      </View>
    </View>
  );
}

function SessionCard({ item, onPress, onDelete }) {
  const [deleteMode, setDeleteMode] = useState(false);
  const [height, setHeight] = useState(null);
  const anim = useRef(new Animated.Value(0)).current;

  const showDelete = () => {
    setDeleteMode(true);
    Animated.timing(anim, { toValue: 1, duration: 250, useNativeDriver: false }).start();
  };
  const hideDelete = () => {
    Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: false }).start(() => setDeleteMode(false));
  };

  const bgColor = anim.interpolate({ inputRange: [0, 1], outputRange: [C.surface, C.red] });

  return (
    <Animated.View style={[styles.cardWrap, { backgroundColor: bgColor }]}>
      {!deleteMode ? (
        <View onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
          <Press style={styles.cardContent} onPress={onPress} onLongPress={showDelete} delayLongPress={400} scaleTo={0.985}>
            <View style={styles.cardTop}>
              <Text style={styles.cardDate}>{formatDate(item.date)}</Text>
              <View style={styles.cardTags}>
                <View style={styles.tag}><Text style={styles.tagText}>{GOAL_LABELS[item.goal]}</Text></View>
                <View style={[styles.tag, styles.tagMuted]}>
                  <Text style={[styles.tagText, { color: C.textSecondary }]}>{LEVEL_LABELS[item.level]}</Text>
                </View>
              </View>
            </View>

            <Text style={styles.cardTitle} numberOfLines={2}>{item.workout?.title?.toUpperCase()}</Text>

            <View style={styles.cardMeta}>
              <Feather name="clock" size={13} color={C.accent} />
              <Text style={styles.cardMetaText}>{sessionMinutes(item)} min</Text>
              <MaterialCommunityIcons name="dumbbell" size={14} color={C.accent} style={{ marginLeft: 10 }} />
              <Text style={styles.cardMetaText}>{item.workout?.exercises?.length ?? 0} exercices</Text>
            </View>
          </Press>
        </View>
      ) : (
        // Même hauteur que la carte : la liste ne saute pas en passant en mode suppression.
        <View style={[styles.deleteRow, height && { height }]}>
          {/* Toute la carte annule ; le bouton reste centre au-dessus. */}
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={hideDelete} activeOpacity={1} onLongPress={hideDelete} delayLongPress={400} />
          <Press style={styles.deleteBtnInner} onPress={() => { hideDelete(); onDelete(item.id); }}>
            <Feather name="trash-2" size={15} color="#fff" />
            <Text style={styles.deleteBtnText}>SUPPRIMER</Text>
          </Press>
        </View>
      )}
    </Animated.View>
  );
}

export default function HomeScreen({ isActive = true }) {
  const navigation = useNavigation();
  const [sessions, setSessions] = useState([]);
  const [profile, setProfile] = useState(DEFAULT_PROFILE);

  // Le profil est relu avec les séances : un prénom modifié apparaît au retour sur l'accueil.
  const load = useCallback(() => {
    getSessions().then(setSessions);
    getProfile().then(setProfile);
  }, []);
  useScreenRefresh(load, isActive);

  // Retrait immédiat de la liste ; si l'écriture échoue, on prévient et on recharge.
  const handleDelete = async (id) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    try {
      await deleteSession(id);
    } catch (err) {
      Alert.alert("Suppression impossible", err.message);
      load();
    }
  };

  /* Deux appuis rapides empilaient deux fois le meme ecran : apres le premier,
     l'accueil n'a plus le focus et la seconde navigation est ignoree. */
  const open = (navigate) => { if (navigation.isFocused()) navigate(); };

  const greeting = new Date().getHours() < 18 ? "Salut" : "Bonsoir";

  const header = (
    <>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>
            {greeting}{profile.firstName ? ` ${profile.firstName}` : ""}
          </Text>
          <Text style={styles.headerTitle}>FITSCAN</Text>
        </View>
        <Press
          style={styles.profileBtn}
          onPress={() => open(() => navigation.navigate("Profile"))}
          scaleTo={0.9}
          accessibilityLabel={profile.firstName ? `Profil de ${profile.firstName}` : "Profil"}
        >
          <Feather name="user" size={20} color={C.accent} />
        </Press>
      </View>

      <StreakCard sessions={sessions} weeklyGoal={profile.weeklyGoal} />

      <View style={styles.listHeader}>
        <Text style={styles.listLabel}>HISTORIQUE</Text>
        <Text style={styles.listCount}>
          {sessions.length} séance{sessions.length > 1 ? "s" : ""}
        </Text>
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>AUCUNE SÉANCE</Text>
            <Text style={styles.emptyBody}>Lance ton premier entraînement en scannant ton équipement.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <SessionCard
            item={item}
            onPress={() => open(() => navigation.navigate("Workout", { workout: item.workout, session: item, readOnly: true }))}
            onDelete={handleDelete}
          />
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />

      <View style={styles.fabWrap}>
        <PrimaryButton label="NOUVELLE SÉANCE" icon="plus" onPress={() => open(() => navigation.navigate("NewSession"))} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  list: { paddingHorizontal: 20, paddingBottom: 130, gap: 12 },

  header: { flexDirection: "row", alignItems: "center", gap: 16, paddingHorizontal: 4, paddingTop: 20, paddingBottom: 18 },
  greeting: { fontFamily: "DMSans_400Regular", fontSize: 14, color: C.textSecondary, marginBottom: 2 },
  headerTitle: { fontFamily: "BebasNeue_400Regular", fontSize: 50, color: C.textPrimary, letterSpacing: 2, lineHeight: 52 },
  profileBtn: {
    width: 44, height: 44, borderRadius: 15,
    alignItems: "center", justifyContent: "center",
    backgroundColor: C.accentSoft, borderWidth: 1, borderColor: "rgba(200,255,0,0.25)",
  },

  hero: {
    backgroundColor: C.accent, borderRadius: R.lg,
    paddingHorizontal: 20, paddingTop: 18, paddingBottom: 20,
    marginBottom: 12,
    ...E.accentGlow,
  },
  heroTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  heroEyebrow: { ...T.label, fontSize: 10, color: "rgba(10,10,10,0.6)", marginBottom: 2 },
  heroValue: { fontFamily: "BebasNeue_400Regular", fontSize: 46, color: INK, letterSpacing: 1, lineHeight: 48 },
  heroSub: { fontFamily: "DMSans_600SemiBold", fontSize: 13, color: "rgba(10,10,10,0.75)" },
  heroRingText: { fontFamily: "DMSans_700Bold", fontSize: 14, color: INK },

  listHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 4, paddingTop: 16, paddingBottom: 4 },
  listLabel: { ...T.label, color: C.textPrimary },
  listCount: { ...T.small, color: C.textSecondary },

  cardWrap: { borderRadius: R.lg, borderWidth: 1, borderColor: C.border, overflow: "hidden", ...E.raised },
  cardContent: { paddingHorizontal: 18, paddingVertical: 16, gap: 10 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardDate: { ...T.label, fontSize: 10, color: C.textMuted },
  cardTags: { flexDirection: "row", gap: 6 },
  tag: { backgroundColor: C.accentSoft, borderRadius: R.pill, paddingHorizontal: 9, paddingVertical: 3 },
  tagMuted: { backgroundColor: C.surface2 },
  tagText: { ...T.label, fontSize: 9, color: C.accent, letterSpacing: 1.2 },
  cardTitle: { fontFamily: "BebasNeue_400Regular", fontSize: 24, color: C.textPrimary, letterSpacing: 0.5, lineHeight: 26 },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  cardMetaText: { fontFamily: "DMSans_400Regular", fontSize: 13, color: C.textSecondary },

  deleteRow: { alignItems: "center", justifyContent: "center", minHeight: 110 },
  deleteBtnInner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderWidth: 1.5, borderColor: "#fff", borderRadius: R.pill,
    paddingHorizontal: 18, paddingVertical: 10,
  },
  deleteBtnText: { fontFamily: "BebasNeue_400Regular", fontSize: 18, color: "#fff", letterSpacing: 1.5 },

  empty: { paddingHorizontal: 4, paddingTop: 24 },
  emptyTitle: { fontFamily: "BebasNeue_400Regular", fontSize: 36, color: C.textPrimary, letterSpacing: 1.5, marginBottom: 8 },
  emptyBody: { ...T.body, maxWidth: 280 },

  fabWrap: { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 24, paddingBottom: 20, paddingTop: 14, backgroundColor: C.bg },
});
