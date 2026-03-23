import AsyncStorage from "@react-native-async-storage/async-storage";

const SESSIONS_KEY = "fitscan_sessions";
const WEIGHTS_KEY = "fitscan_weights";

// ─── Sessions ─────────────────────────────────────────────────────
export async function getSessions() {
  try {
    const data = await AsyncStorage.getItem(SESSIONS_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

export async function saveSession(session) {
  try {
    const sessions = await getSessions();
    const newSession = { ...session, id: Date.now().toString(), date: new Date().toISOString() };
    sessions.unshift(newSession);
    await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
    return newSession;
  } catch (e) { throw new Error("Impossible de sauvegarder la séance"); }
}

export async function deleteSession(id) {
  try {
    const sessions = await getSessions();
    await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions.filter((s) => s.id !== id)));
  } catch (e) { throw new Error("Impossible de supprimer la séance"); }
}

// ─── Poids par exercice ───────────────────────────────────────────
// Format : { "Squat": [{ date, weight, unit }], ... }

export async function getWeightHistory() {
  try {
    const data = await AsyncStorage.getItem(WEIGHTS_KEY);
    return data ? JSON.parse(data) : {};
  } catch { return {}; }
}

export async function saveWeight(exerciseName, weight, unit = "kg") {
  try {
    const history = await getWeightHistory();
    const key = exerciseName.toLowerCase().trim();
    if (!history[key]) history[key] = [];
    history[key].unshift({ date: new Date().toISOString(), weight, unit });
    // Garde seulement les 10 dernières entrées par exercice
    history[key] = history[key].slice(0, 10);
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