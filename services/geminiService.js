import { getProfile } from "../data/storage";

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY; // Remplace par ta clé Gemini
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

// fetch n'a pas de délai par défaut : sur un réseau qui cale, la promesse ne se
// résout jamais et l'écran reste sur son indicateur de chargement.
const TIMEOUT_MS = 30000;

// Les messages d'erreur de l'API sont en anglais et parlent de champs internes.
function httpErrorMessage(status, body) {
  const reason = body?.error?.details?.find((d) => d?.reason)?.reason;
  if (reason === "API_KEY_INVALID" || status === 401 || status === 403) {
    return "Clé API Gemini invalide ou non autorisée.";
  }
  if (status === 429) return "Quota Gemini atteint. Réessaie dans quelques minutes.";
  if (status >= 500) return "Gemini est indisponible pour le moment. Réessaie plus tard.";
  return `Erreur Gemini (${status}). Réessaie.`;
}

async function callGemini(parts) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let response;
  try {
    response = await fetch(`${BASE_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 8192,
          // La réflexion de gemini-2.5-flash triplait le temps de réponse (~10 s
          // contre ~3 s) sans améliorer un JSON dont le format est déjà imposé.
          thinkingConfig: { thinkingBudget: 0 },
          // JSON strict : plus de balises markdown ni de texte autour de la réponse.
          responseMimeType: "application/json",
        },
      }),
    });
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("Gemini ne répond pas. Vérifie ta connexion et réessaie.");
    }
    throw new Error("Connexion impossible à Gemini. Vérifie ta connexion internet.");
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok) {
    // Le corps d'erreur n'est pas toujours du JSON (page HTML d'une passerelle, par exemple).
    const body = await response.json().catch(() => null);
    throw new Error(httpErrorMessage(response.status, body));
  }
  const data = await response.json().catch(() => null);
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Réponse vide de Gemini. Réessaie.");
  return text;
}

function parseJSON(text) {
  let cleaned = text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end !== -1) {
    cleaned = cleaned.substring(start, end + 1);
  }
  try {
    return JSON.parse(cleaned);
  } catch {
    // Le texte brut part dans les logs, pas dans l'alerte affichée.
    console.warn("Réponse Gemini illisible :", text);
    throw new Error("Réponse de Gemini illisible. Réessaie.");
  }
}

// ─── Nettoyage des réponses ───────────────────────────────────────
/* Gemini suit presque toujours le format demandé, mais un champ manquant ou mal
   typé suffisait à faire planter un écran : muscles en texte (.join, .map),
   exercice sans nom (.toUpperCase), séries « 3-4 » (aucune case à cocher). */
const asText = (v) => (typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "");
const asList = (v) =>
  (Array.isArray(v) ? v : typeof v === "string" ? v.split(/[,;·]/) : []).map(asText).filter(Boolean);
// parseInt garde le premier nombre : « 3-4 » devient 3.
const asInt = (v, fallback, min, max) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};
const CATEGORIES = ["cardio", "force", "poids_libre", "accessoire"];

function cleanExercise(raw) {
  const name = asText(raw?.name);
  if (!name) return null;
  return {
    name,
    equipment: asText(raw.equipment),
    sets: asInt(raw.sets, 3, 1, 10),
    reps: asText(raw.reps) || "10",
    rest: asInt(raw.rest, 60, 0, 600),
    muscles: asList(raw.muscles),
    tips: asText(raw.tips),
    youtubeQuery: asText(raw.youtubeQuery) || `${name} exécution`,
    requiresWeight: raw.requiresWeight === true || raw.requiresWeight === "true",
  };
}

function cleanPhase(raw, fallbackDuration) {
  if (!raw || typeof raw !== "object") return null;
  const exercises = asList(raw.exercises);
  return exercises.length ? { duration: asInt(raw.duration, fallbackDuration, 0, 60), exercises } : null;
}

// « 29 ans, 75 kg, 180 cm », limité aux données renseignées dans le profil.
async function physicalProfileLine() {
  const profile = await getProfile();
  return [
    profile.age != null && `${profile.age} ans`,
    profile.weightKg != null && `${profile.weightKg} kg`,
    profile.heightCm != null && `${profile.heightCm} cm`,
  ].filter(Boolean).join(", ");
}

export async function identifyEquipment(base64Image) {
  const prompt = `Tu es un expert en équipement de fitness.
Analyse cette photo et identifie TOUS les appareils ou outils de fitness visibles.

Réponds UNIQUEMENT en JSON valide, sans markdown, sans backticks :
{
  "equipments": [
    {
      "name": "Nom de l'appareil en français",
      "category": "cardio | force | poids_libre | accessoire",
      "muscles": ["muscle1", "muscle2"]
    }
  ]
}

Si aucun équipement de fitness n'est détecté :
{ "equipments": [] }`;

  const raw = parseJSON(await callGemini([
    { inline_data: { mime_type: "image/jpeg", data: base64Image } },
    { text: prompt },
  ]));

  const equipments = (Array.isArray(raw?.equipments) ? raw.equipments : [])
    .map((e) => {
      const name = asText(e?.name);
      if (!name) return null;
      return {
        name,
        category: CATEGORIES.includes(e.category) ? e.category : "accessoire",
        muscles: asList(e.muscles),
      };
    })
    .filter(Boolean);
  return { equipments };
}

export async function generateWorkout({ equipments, level, goal, split, duration }) {
  const equipmentList = equipments.map((e) => e.name).join(", ");
  const splitLabel = split === "upper" ? "Haut du corps uniquement"
    : split === "lower" ? "Bas du corps uniquement"
    : "Corps entier (Full Body)";
  const physical = await physicalProfileLine();
  const physicalLine = physical
    ? `Profil physique : ${physical} (adapte le volume et les charges en conséquence)\n`
    : "";

  const prompt = `Tu es un coach fitness expert. Génère une séance d'entraînement complète.

Équipement disponible : ${equipmentList}
Niveau : ${level}
${physicalLine}Objectif : ${goal}
Muscles ciblés : ${splitLabel}
Durée souhaitée : ${duration} minutes

Réponds UNIQUEMENT en JSON valide, sans markdown, sans backticks. Sois CONCIS dans les textes (tips max 10 mots, exercices max 8 par séance) :
{
  "title": "Titre de la séance",
  "totalDuration": 45,
  "warmup": {
    "duration": 5,
    "exercises": ["Exercice 1", "Exercice 2"]
  },
  "exercises": [
    {
      "name": "Nom de l'exercice",
      "equipment": "Appareil utilisé",
      "sets": 3,
      "reps": "10-12 (format court, max 8 caractères, ex: 10-12, 15, 30s)",
      "rest": 60,
      "muscles": ["muscle1", "muscle2"],
      "tips": "Conseil court (max 10 mots)",
      "youtubeQuery": "requête youtube pour trouver une vidéo de cet exercice en français",
      "requiresWeight": true
    }
  ],
  "cooldown": {
    "duration": 5,
    "exercises": ["Étirement 1", "Étirement 2"]
  }
}`;

  const raw = parseJSON(await callGemini([{ text: prompt }]));
  const exercises = (Array.isArray(raw?.exercises) ? raw.exercises : []).map(cleanExercise).filter(Boolean);
  if (exercises.length === 0) throw new Error("Gemini n'a proposé aucun exercice. Réessaie.");

  return {
    title: asText(raw.title) || "Ma séance",
    totalDuration: asInt(raw.totalDuration, Number(duration) || 45, 5, 240),
    warmup: cleanPhase(raw.warmup, 5),
    exercises,
    cooldown: cleanPhase(raw.cooldown, 5),
  };
}

export async function getQuickExercises(equipmentName) {
  const prompt = `Tu es un coach fitness expert.
Pour l'équipement suivant : "${equipmentName}"
Génère 4 exercices variés adaptés à cet équipement.

Réponds UNIQUEMENT en JSON valide, sans markdown, sans backticks :
{
  "exercises": [
    {
      "name": "Nom de l'exercice",
      "muscles": ["muscle1", "muscle2"],
      "sets": 3,
      "reps": "10-12",
      "tips": "Conseil court en 1 phrase",
      "youtubeQuery": "requête youtube courte en français"
    }
  ]
}`;

  const raw = parseJSON(await callGemini([{ text: prompt }]));
  return {
    exercises: (Array.isArray(raw?.exercises) ? raw.exercises : []).map(cleanExercise).filter(Boolean),
  };
}
