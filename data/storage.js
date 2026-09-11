import AsyncStorage from "@react-native-async-storage/async-storage";

const SESSIONS_KEY = "fitscan_sessions";
const WEIGHTS_KEY = "fitscan_weights";
const PROFILE_KEY = "fitscan_profile";

/* Lecture stricte, réservée aux écritures. Les lectures d'affichage ci-dessous
   renvoient une valeur vide en cas d'échec ; une écriture qui s'appuierait dessus
   remplacerait tout l'historique par la seule entrée ajoutée. Ici l'erreur
   remonte, et rien n'est écrit. */
async function readStrict(key, fallback) {
  const data = await AsyncStorage.getItem(key);
  return data ? JSON.parse(data) : fallback;
}

// ─── Profil ───────────────────────────────────────────────────────
// Les données physiques restent null tant qu'elles ne sont pas renseignées.
export const DEFAULT_PROFILE = {
  firstName: "",
  weeklyGoal: 3,
  level: "intermediaire",
  goal: "mixte",
  age: null,
  weightKg: null,
  heightCm: null,
};

export async function getProfile() {
  try {
    const data = await AsyncStorage.getItem(PROFILE_KEY);
    return { ...DEFAULT_PROFILE, ...(data ? JSON.parse(data) : {}) };
  } catch { return { ...DEFAULT_PROFILE }; }
}

export async function saveProfile(profile) {
  try {
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch (e) { throw new Error("Impossible de sauvegarder le profil"); }
}

// ─── Sessions ─────────────────────────────────────────────────────
export async function getSessions() {
  try {
    const data = await AsyncStorage.getItem(SESSIONS_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

export async function saveSession(session) {
  try {
    const sessions = await readStrict(SESSIONS_KEY, []);
    const newSession = { ...session, id: Date.now().toString(), date: new Date().toISOString() };
    sessions.unshift(newSession);
    await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
    return newSession;
  } catch (e) { throw new Error("Impossible de sauvegarder la séance"); }
}

/* Durée d'une séance : le temps réellement passé si on l'a mesuré, sinon la
   durée prévue par Gemini — les séances d'avant la mesure n'ont que celle-ci. */
export function sessionMinutes(session) {
  return session?.elapsedMin ?? session?.workout?.totalDuration ?? 0;
}

export async function deleteSession(id) {
  try {
    const sessions = await readStrict(SESSIONS_KEY, []);
    await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions.filter((s) => s.id !== id)));
  } catch (e) { throw new Error("Impossible de supprimer la séance"); }
}

// ─── Poids par exercice ───────────────────────────────────────────
// Format : { "squat": [{ date, weight, unit }], ... }, du plus récent au plus ancien.

export async function getWeightHistory() {
  try {
    const data = await AsyncStorage.getItem(WEIGHTS_KEY);
    return data ? JSON.parse(data) : {};
  } catch { return {}; }
}

export async function saveWeight(exerciseName, weight, unit = "kg") {
  try {
    const history = await readStrict(WEIGHTS_KEY, {});
    const key = exerciseName.toLowerCase().trim();
    if (!history[key]) history[key] = [];
    history[key].unshift({ date: new Date().toISOString(), weight, unit });
    // Chaque « OK » ajoute une entrée : 10 ne couvraient parfois qu'une séance,
    // trop peu pour la courbe de suivi des charges.
    history[key] = history[key].slice(0, 60);
    await AsyncStorage.setItem(WEIGHTS_KEY, JSON.stringify(history));
  } catch (e) { throw new Error("Impossible de sauvegarder le poids"); }
}

export async function getLastWeight(exerciseName) {
  try {
    const history = await getWeightHistory();
    const key = exerciseName.toLowerCase().trim();
    return history[key]?.[0] || null;
  } catch { return null; }
}
