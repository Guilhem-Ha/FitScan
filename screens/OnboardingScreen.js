import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Dimensions, StatusBar, Image,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import { C, T, R } from "../theme";
import { PrimaryButton } from "../ui/kit";

const { width: SW, height: SH } = Dimensions.get("window");
const SLIDE_DURATION = 10000;
const PHOTO_HEIGHT = SH * 0.62;
const FADE_STEPS = 14;

const SLIDES = [
  {
    chip: "BIENVENUE · 01/04",
    icon: "zap",
    title: "ENTRAÎNE-TOI\nINTELLIGEMMENT.",
    body: "FitScan analyse ton équipement et génère des séances personnalisées pour toi, en quelques secondes.",
    image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80",
  },
  {
    chip: "ÉTAPE 1 · 02/04",
    icon: "maximize",
    title: "SCANNE\nTON MATOS.",
    body: "Prends une photo de ton équipement — haltères, machines, barres. L'IA identifie tout automatiquement.",
    image: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&q=80",
  },
  {
    chip: "ÉTAPE 2 · 03/04",
    icon: "sliders",
    title: "GÉNÈRE\nTA SÉANCE.",
    body: "Choisis ton niveau, ton objectif et ta durée. FitScan crée un programme adapté avec vidéos d'exécution.",
    image: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80",
  },
  {
    chip: "ÉTAPE 3 · 04/04",
    icon: "bar-chart-2",
    title: "SUIS TA\nPROGRESSION.",
    body: "Note tes poids, consulte tes stats et vois tes muscles les plus travaillés. Progresse séance après séance.",
    image: "https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=800&q=80",
  },
];

export default function OnboardingScreen({ onDone }) {
  const [current, setCurrent] = useState(0);
  const progresses = useRef(SLIDES.map(() => new Animated.Value(0))).current;
  const pausedRef = useRef(false);
  const animRef = useRef(null);
  const elapsedRef = useRef(0);
  const startTimeRef = useRef(null);

  const handleDone = async () => {
    await AsyncStorage.setItem("fitscan_onboarding_done", "true");
    onDone();
  };

  const goTo = (index) => {
    if (index >= SLIDES.length) { handleDone(); return; }
    if (index < 0) return;
    progresses.forEach((p, i) => p.setValue(i < index ? 1 : 0));
    elapsedRef.current = 0;
    setCurrent(index);
  };

  const startAnim = (from = 0) => {
    if (animRef.current) animRef.current.stop();
    startTimeRef.current = Date.now();
    progresses[current].setValue(from);
    animRef.current = Animated.timing(progresses[current], {
      toValue: 1,
      duration: SLIDE_DURATION * (1 - from),
      useNativeDriver: false,
    });
    animRef.current.start(({ finished }) => {
      if (finished && !pausedRef.current && current < SLIDES.length - 1) goTo(current + 1);
    });
  };

  const pauseAnim = () => {
    if (pausedRef.current) return;
    pausedRef.current = true;
    if (animRef.current) animRef.current.stop();
    const elapsed = Date.now() - (startTimeRef.current || Date.now());
    elapsedRef.current = elapsed / SLIDE_DURATION;
  };

  const resumeAnim = () => {
    if (!pausedRef.current) return;
    pausedRef.current = false;
    startAnim(elapsedRef.current);
  };

  useEffect(() => {
    pausedRef.current = false;
    elapsedRef.current = 0;
    startAnim(0);
    return () => { if (animRef.current) animRef.current.stop(); };
  }, [current]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTap = (e) => {
    if (pausedRef.current) return;
    if (e.nativeEvent.locationX > SW / 2) goTo(current + 1);
    else goTo(current - 1);
  };

  const slide = SLIDES[current];
  const isLast = current === SLIDES.length - 1;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <Image source={{ uri: slide.image }} style={styles.photo} />
      {/* Fondu de la photo vers le fond, sans dépendance de dégradé */}
      <View style={styles.fade} pointerEvents="none">
        {Array.from({ length: FADE_STEPS }).map((_, i) => (
          <View key={i} style={{ flex: 1, backgroundColor: C.bg, opacity: (i + 1) / FADE_STEPS }} />
        ))}
      </View>

      <View style={styles.bars}>
        {SLIDES.map((_, i) => (
          <View key={i} style={styles.barBg}>
            <Animated.View
              style={[styles.barFill, {
                width: progresses[i].interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
              }]}
            />
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.skipBtn} onPress={handleDone} activeOpacity={0.7}>
        <Text style={styles.skipText}>PASSER</Text>
      </TouchableOpacity>

      {/* Tap à droite / gauche pour naviguer, maintenir pour pauser */}
      <TouchableOpacity
        style={styles.tapZone}
        onPress={handleTap}
        onLongPress={pauseAnim}
        onPressOut={resumeAnim}
        delayLongPress={150}
        activeOpacity={1}
      >
        <View style={styles.content}>
          <View style={styles.chip}>
            <Feather name={slide.icon} size={12} color={C.accent} />
            <Text style={styles.chipText}>{slide.chip}</Text>
          </View>
          <Text style={styles.title}>{slide.title}</Text>
          <Text style={styles.body}>{slide.body}</Text>

          <PrimaryButton
            label={isLast ? "COMMENCER" : "CONTINUER"}
            onPress={() => (isLast ? handleDone() : goTo(current + 1))}
            style={styles.cta}
          />
          <Text style={styles.hint}>Maintenir pour pauser · appuyer pour avancer</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  photo: { position: "absolute", top: 0, left: 0, right: 0, height: PHOTO_HEIGHT, resizeMode: "cover" },
  fade: { position: "absolute", left: 0, right: 0, top: PHOTO_HEIGHT * 0.45, height: PHOTO_HEIGHT * 0.55 },

  bars: { flexDirection: "row", paddingHorizontal: 16, paddingTop: 52, gap: 4, zIndex: 10 },
  barBg: { flex: 1, height: 3, borderRadius: R.pill, backgroundColor: "rgba(255,255,255,0.25)", overflow: "hidden" },
  barFill: { height: "100%", borderRadius: R.pill, backgroundColor: "#fff" },

  skipBtn: {
    position: "absolute", top: 72, right: 16, zIndex: 20,
    paddingVertical: 7, paddingHorizontal: 13, borderRadius: R.pill,
    backgroundColor: "rgba(10,10,10,0.6)", borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
  },
  skipText: { fontFamily: "DMSans_700Bold", fontSize: 10, color: C.textPrimary, letterSpacing: 1.5 },

  tapZone: { flex: 1, justifyContent: "flex-end" },
  content: { paddingHorizontal: 24, paddingBottom: 36 },

  chip: {
    flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start",
    borderWidth: 1, borderColor: "rgba(200,255,0,0.4)", backgroundColor: C.accentSofter,
    borderRadius: R.pill, paddingHorizontal: 10, paddingVertical: 5, marginBottom: 14,
  },
  chipText: { fontFamily: "DMSans_700Bold", fontSize: 10, color: C.accent, letterSpacing: 1.2 },
  title: { fontFamily: "BebasNeue_400Regular", fontSize: 54, color: C.textPrimary, letterSpacing: 2, lineHeight: 54, marginBottom: 12 },
  body: { fontFamily: "DMSans_400Regular", fontSize: 15, color: C.textSecondary, lineHeight: 23, maxWidth: 330 },

  cta: { marginTop: 26 },
  hint: { ...T.small, fontSize: 11, color: C.textMuted, textAlign: "center", marginTop: 12 },
});
