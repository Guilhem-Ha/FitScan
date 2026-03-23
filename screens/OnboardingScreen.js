import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Dimensions, StatusBar, Image, PanResponder,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { C, T } from "../theme";

const { width: SW, height: SH } = Dimensions.get("window");
const SLIDE_DURATION = 10000;

const SLIDES = [
  {
    eyebrow: "BIENVENUE",
    title: "ENTRAINE-TOI\nINTELLIGEMMENT.",
    body: "FitScan analyse ton équipement et génère des séances personnalisées pour toi, en quelques secondes.",
    accent: "01 / 04",
    image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80",
  },
  {
    eyebrow: "ÉTAPE 1",
    title: "SCANNE\nTON MATOS.",
    body: "Prends une photo de ton équipement — haltères, machines, barres. L'IA identifie tout automatiquement.",
    accent: "02 / 04",
    image: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&q=80",
  },
  {
    eyebrow: "ÉTAPE 2",
    title: "GÉNÈRE\nTA SÉANCE.",
    body: "Choisis ton niveau, ton objectif et ta durée. FitScan crée un programme adapté avec vidéos d'exécution.",
    accent: "03 / 04",
    image: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80",
  },
  {
    eyebrow: "ÉTAPE 3",
    title: "SUIS TA\nPROGRESSION.",
    body: "Note tes poids, consulte tes stats et vois tes muscles les plus travaillés. Progresse séance après séance.",
    accent: "04 / 04",
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
    const remaining = SLIDE_DURATION * (1 - from);
    animRef.current = Animated.timing(progresses[current], {
      toValue: 1,
      duration: remaining,
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
    // Calcule la progression actuelle
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
    const x = e.nativeEvent.locationX;
    if (x > SW / 2) goTo(current + 1);
    else goTo(current - 1);
  };

  const slide = SLIDES[current];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Image de fond */}
      <Image source={{ uri: slide.image }} style={styles.bgImage} />

      {/* Overlay dégradé */}
      <View style={styles.overlay} />

      {/* Barres de progression */}
      <View style={styles.bars}>
        {SLIDES.map((_, i) => (
          <View key={i} style={styles.barBg}>
            <Animated.View
              style={[styles.barFill, {
                width: progresses[i].interpolate({
                  inputRange: [0, 1], outputRange: ["0%", "100%"],
                }),
              }]}
            />
          </View>
        ))}
      </View>

      {/* Bouton passer — plus bas */}
      <TouchableOpacity style={styles.skipBtn} onPress={handleDone} activeOpacity={0.7}>
        <Text style={styles.skipText}>PASSER</Text>
      </TouchableOpacity>

      {/* Zone principale — tap + hold */}
      <TouchableOpacity
        style={styles.tapZone}
        onPress={handleTap}
        onLongPress={pauseAnim}
        onPressOut={resumeAnim}
        delayLongPress={150}
        activeOpacity={1}
      >
        {/* Contenu texte en bas */}
        <View style={styles.content}>
          <Text style={styles.accentText}>{slide.accent}</Text>
          <View style={styles.divider} />
          <Text style={styles.eyebrow}>{slide.eyebrow}</Text>
          <Text style={styles.title}>{slide.title}</Text>
          <Text style={styles.body}>{slide.body}</Text>
        </View>

        {/* Bouton commencer sur la dernière slide */}
        {current === SLIDES.length - 1 && (
          <TouchableOpacity style={styles.startBtn} onPress={handleDone} activeOpacity={0.85}>
            <Text style={styles.startBtnText}>COMMENCER →</Text>
          </TouchableOpacity>
        )}

        {current < SLIDES.length - 1 && (
          <View style={styles.tapHint}>
            <Text style={styles.tapHintText}>Maintenir pour pauser · Appuyer pour avancer</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  bgImage: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    height: SH * 0.55,
    resizeMode: "cover",
  },

  overlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "transparent",
    // Dégradé simulé avec plusieurs vues
  },

  // Dégradé du bas vers le haut
  bars: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 56,
    gap: 4,
    zIndex: 10,
  },
  barBg: {
    flex: 1, height: 2,
    backgroundColor: "rgba(255,255,255,0.3)",
    overflow: "hidden",
  },
  barFill: { height: "100%", backgroundColor: "#fff" },

  skipBtn: {
    position: "absolute",
    top: 100,
    right: 24,
    zIndex: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  skipText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 12, color: "#fff", letterSpacing: 1.5,
  },

  tapZone: {
    flex: 1,
    justifyContent: "flex-end",
  },

  content: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    backgroundColor: C.bg,
    paddingTop: 28,
  },
  accentText: {
    fontFamily: "BebasNeue_400Regular",
    fontSize: 13, color: C.accent, letterSpacing: 3, marginBottom: 16,
  },
  divider: { height: 1, backgroundColor: C.border, marginBottom: 22, width: 40 },
  eyebrow: { ...T.label, color: C.textSecondary, marginBottom: 16 },
  title: {
    fontFamily: "BebasNeue_400Regular",
    fontSize: 52, color: C.textPrimary,
    letterSpacing: 2, lineHeight: 52, marginBottom: 16,
  },
  body: {
    fontFamily: "DMSans_400Regular",
    fontSize: 15, color: C.textSecondary,
    lineHeight: 24, maxWidth: 320,
  },

  startBtn: {
    backgroundColor: C.accent,
    marginHorizontal: 24,
    paddingVertical: 18,
    alignItems: "center",
    marginBottom: 8,
  },
  startBtnText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 15, color: C.bg, letterSpacing: 2,
  },

  tapHint: { alignItems: "center", paddingVertical: 14, backgroundColor: C.bg },
  tapHintText: { ...T.small, color: C.textMuted },
});