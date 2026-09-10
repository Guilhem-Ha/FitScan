import React, { useRef } from "react";
import { View, Text, Pressable, Animated, StyleSheet } from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { C, T, R, E, S } from "../theme";

/* Le Pressable enveloppe la vue animée : les propriétés qui positionnent le bouton
   dans son parent doivent donc vivre sur l'enveloppe, sinon la zone tactile déborde
   du visuel. Celles-ci sont extraites du style ; le reste habille la vue animée. */
const OUTER_KEYS = [
  "flex", "alignSelf", "position", "top", "right", "bottom", "left", "zIndex",
  "margin", "marginTop", "marginRight", "marginBottom", "marginLeft",
  "marginHorizontal", "marginVertical",
];

/* Pressable qui s'enfonce légèrement — micro-interaction commune à tous les CTA */
export function Press({ style, onPress, onLongPress, delayLongPress, children, scaleTo = 0.97, disabled }) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (v) =>
    Animated.spring(scale, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 4 }).start();

  const flat = StyleSheet.flatten(style) || {};
  const outer = {};
  const inner = { ...flat };
  OUTER_KEYS.forEach((k) => {
    if (flat[k] !== undefined) {
      outer[k] = flat[k];
      delete inner[k];
    }
  });
  // La taille reste des deux côtés : l'enveloppe la réserve, la vue animée la remplit.
  if (flat.width !== undefined) outer.width = flat.width;
  if (flat.height !== undefined) outer.height = flat.height;

  return (
    <Pressable
      style={outer}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={delayLongPress}
      disabled={disabled}
      onPressIn={() => to(scaleTo)}
      onPressOut={() => to(1)}
    >
      <Animated.View style={[inner, { transform: [{ scale }] }, disabled && { opacity: 0.4 }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

export function Card({ tinted, style, children, onPress }) {
  const base = tinted ? S.cardTinted : S.card;
  if (!onPress) return <View style={[base, style]}>{children}</View>;
  return <Press style={[base, style]} onPress={onPress}>{children}</Press>;
}

export function PrimaryButton({ label, icon, onPress, disabled, style }) {
  return (
    <Press style={[S.btnPrimary, kitStyles.btnRow, style]} onPress={onPress} disabled={disabled}>
      {icon ? <Feather name={icon} size={17} color={C.bg} /> : null}
      <Text style={[T.btn, { letterSpacing: 2 }]}>{label}</Text>
    </Press>
  );
}

export function GhostButton({ label, icon, onPress, style }) {
  return (
    <Press style={[S.btnSecondary, kitStyles.btnRow, style]} onPress={onPress}>
      {icon ? <Feather name={icon} size={17} color={C.textPrimary} /> : null}
      <Text style={[T.btn, { color: C.textPrimary, letterSpacing: 2 }]}>{label}</Text>
    </Press>
  );
}

export function Chip({ label, active, onPress }) {
  return (
    <Press style={[S.chip, active && S.chipActive]} onPress={onPress} scaleTo={0.94}>
      <Text style={[T.label, { fontSize: 10, color: active ? C.accent : C.textSecondary }]}>{label}</Text>
    </Press>
  );
}

export function SectionLabel({ children, accent, style }) {
  return (
    <View style={[kitStyles.sectionRow, style]}>
      <View style={[kitStyles.tick, accent && { backgroundColor: C.accent }]} />
      <Text style={[T.label, accent && { color: C.accent }]}>{children}</Text>
    </View>
  );
}

/* Icône dans un carré teinté — remplace les emojis.
   tone "accent" teinte en lime, tout autre ton reste neutre ; `color` impose une
   teinte (catégories d'équipement). `family="mci"` pour les pictos absents de
   Feather, comme l'haltère ou le trophée. */
export function IconBadge({ name, tone = "accent", size = 44, color, family = "feather" }) {
  const tint = color || (tone === "accent" ? C.accent : null);
  const Icon = family === "mci" ? MaterialCommunityIcons : Feather;
  return (
    <View
      style={[
        kitStyles.iconBadge,
        { width: size, height: size, borderRadius: size / 3 },
        tint
          ? { backgroundColor: tint + "22", borderColor: tint + "40" }
          : { backgroundColor: C.surface2, borderColor: C.border },
      ]}
    >
      <Icon name={name} size={size * 0.46} color={tint || C.textPrimary} />
    </View>
  );
}

/* Barre de progression arrondie animée */
export function ProgressBar({ value = 0, height = 6, color = C.accent, trackColor = C.border }) {
  const w = useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.timing(w, { toValue: value, duration: 550, useNativeDriver: false }).start();
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  const width = w.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });
  return (
    <View style={{ height, borderRadius: R.pill, backgroundColor: trackColor, overflow: "hidden" }}>
      <Animated.View style={{ width, height: "100%", borderRadius: R.pill, backgroundColor: color }} />
    </View>
  );
}

/* Anneau de progression (chrono de repos, complétion de séance) — sans dépendance SVG.
   Deux demi-anneaux pivotants, chacun clippé dans sa moitié : la portion visible
   croît de 0 à 180° par moitié, ce qui donne un arc réellement proportionnel. */
export function Ring({ size = 180, stroke = 8, value = 0, color = C.accent, trackColor = C.border, children }) {
  const half = size / 2;
  const deg = Math.max(0, Math.min(1, value)) * 360;

  /* borderTop + borderRight colorent l'arc de -45° à +135° : les 45° d'offset
     ramènent son origine sur midi. */
  const HalfRing = ({ side, rotate }) => (
    <View style={{ position: "absolute", top: 0, width: half, height: size, overflow: "hidden", [side]: 0 }}>
      <View
        style={{
          position: "absolute", top: 0, [side]: 0,
          width: size, height: size, borderRadius: half,
          borderWidth: stroke,
          borderTopColor: color, borderRightColor: color,
          borderBottomColor: "transparent", borderLeftColor: "transparent",
          transform: [{ rotate: rotate + 45 + "deg" }],
        }}
      />
    </View>
  );

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <View
        style={[
          StyleSheet.absoluteFill,
          { borderRadius: half, borderWidth: stroke, borderColor: trackColor },
        ]}
      />
      <HalfRing side="right" rotate={Math.min(deg, 180) - 180} />
      <HalfRing side="left" rotate={Math.max(deg - 180, 0)} />
      {children}
    </View>
  );
}

export function BackButton({ onPress }) {
  return (
    <Press style={kitStyles.backSquare} onPress={onPress} scaleTo={0.9}>
      <Feather name="chevron-left" size={18} color={C.textPrimary} />
    </Press>
  );
}

/* En-tête du parcours de création : retour, avancement, étape courante. */
export function StepHeader({ step, total = 3, onBack }) {
  return (
    <View style={kitStyles.stepRow}>
      <BackButton onPress={onBack} />
      <View style={{ flex: 1 }}>
        <ProgressBar value={step / total} height={4} />
      </View>
      <Text style={kitStyles.stepText}>{step}/{total}</Text>
    </View>
  );
}

/* Barre d'action fixée en bas d'écran, au-dessus du contenu qui défile. */
export function FooterBar({ children }) {
  return <View style={kitStyles.footer}>{children}</View>;
}

const kitStyles = StyleSheet.create({
  btnRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  sectionRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  tick: { width: 3, height: 12, borderRadius: 2, backgroundColor: C.textMuted },
  iconBadge: { alignItems: "center", justifyContent: "center", borderWidth: 1 },

  backSquare: {
    width: 40, height: 40, borderRadius: R.sm,
    alignItems: "center", justifyContent: "center",
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
  },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 20 },
  stepText: { fontFamily: "DMSans_600SemiBold", fontSize: 12, color: C.textSecondary },

  footer: {
    position: "absolute", left: 0, right: 0, bottom: 0,
    paddingHorizontal: 24, paddingTop: 14, paddingBottom: 24,
    backgroundColor: C.bg, borderTopWidth: 1, borderColor: C.border,
  },
});

export { E, R };
