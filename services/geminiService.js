import { getProfile } from "../data/storage";

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY; // Remplace par ta clé Gemini
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

// fetch n'a pas de délai par défaut : sur un réseau qui cale, la promesse ne se
// résout jamais et l'écran reste sur son indicateur de chargement.
const TIMEOUT_MS = 30000;

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
    const err = await response.json();
    throw new Error(`Erreur Gemini: ${err.error?.message || response.status}`);
  }
  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Réponse vide de Gemini");
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
  return JSON.parse(cleaned);
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
      "emoji": "un seul emoji qui représente visuellement cet appareil (ex: 🏋️ pour haltères, 🚴 pour vélo, 🏃 pour tapis de course)",
      "wikipediaSearch": "terme de recherche en anglais pour trouver cet appareil sur Wikipedia (ex: dumbbell, barbell, treadmill, rowing machine)",
      "category": "cardio | force | poids_libre | accessoire",
      "muscles": ["muscle1", "muscle2"],
      "confidence": 0.95
    }
  ]
}

Si aucun équipement de fitness n'est détecté :
{ "equipments": [] }`;

  const text = await callGemini([
    { inline_data: { mime_type: "image/jpeg", data: base64Image } },
    { text: prompt },
  ]);

  try {
    return parseJSON(text);
  } catch {
    throw new Error("Réponse non parsable : " + text);
  }
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

  const text = await callGemini([{ text: prompt }]);

  try {
    return parseJSON(text);
  } catch {
    throw new Error("Réponse non parsable : " + text);
  }
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

  const text = await callGemini([{ text: prompt }]);
  try {
    return parseJSON(text);
  } catch {
    throw new Error("Réponse non parsable : " + text);
  }
}
