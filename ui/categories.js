import { C } from "../theme";

// Teinte et pictogramme (MaterialCommunityIcons) par catégorie renvoyée par Gemini.
const CATEGORIES = {
  cardio: { color: C.blue, icon: "heart-pulse" },
  force: { color: C.red, icon: "weight-lifter" },
  poids_libre: { color: C.amber, icon: "dumbbell" },
  accessoire: { color: C.green, icon: "jump-rope" },
};

const FALLBACK = { color: C.textSecondary, icon: "dumbbell" };

export const categoryOf = (key) => CATEGORIES[key] || FALLBACK;
