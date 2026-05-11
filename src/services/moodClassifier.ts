/**
 * Mood Classifier Service
 *
 * Uses a trained BiLSTM model exported as ONNX (public/model/mood_model.onnx)
 * loaded via onnxruntime-web — pure ESM, no CJS issues, no TensorFlow.js.
 *
 * Falls back to a curated rule-based lexicon if the model file isn't present.
 *
 * Training: python train_mood_model.py
 * Output:   public/model/mood_model.onnx + public/model/vocab.json
 */
import * as ort from 'onnxruntime-web';
import { MoodType, MoodPrediction } from '../types';

const MOOD_LABELS: MoodType[] = ['happy', 'sad', 'productive', 'tired', 'neutral', 'angry'];
const MODEL_URL = '/model/mood_model.onnx';
const VOCAB_URL  = '/model/vocab.json';
const MAX_SEQUENCE_LENGTH = 100;

let session: ort.InferenceSession | null = null;
let vocab: Record<string, number> | null = null;
let loading = false;
let loadFailed = false;

// Point the WASM binaries to the CDN so we don't need to copy them ourselves
ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/';

// ── Model loading ────────────────────────────────────────────────────────────

async function loadModel(): Promise<boolean> {
  if (session && vocab) return true;
  if (loading || loadFailed) return false;

  loading = true;
  try {
    // Load vocabulary — check status first so a 404 HTML page doesn't throw a JSON SyntaxError
    const vocabRes = await fetch(VOCAB_URL);
    if (!vocabRes.ok) {
      console.info(
        '[MoodClassifier] Model not trained yet (vocab.json missing). ' +
        'Run `python train_mood_model.py` to enable AI mood detection. ' +
        'Using lexicon fallback in the meantime.'
      );
      loadFailed = true; loading = false;
      return false;
    }
    const contentType = vocabRes.headers.get('content-type') ?? '';
    if (!contentType.includes('json')) {
      console.info('[MoodClassifier] vocab.json returned non-JSON — model not available yet. Using lexicon fallback.');
      loadFailed = true; loading = false;
      return false;
    }
    vocab = await vocabRes.json();

    // Load ONNX session
    session = await ort.InferenceSession.create(MODEL_URL, {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
    });

    console.log('[MoodClassifier] ONNX model loaded successfully. Inputs:', session.inputNames);
    loading = false;
    return true;
  } catch (err) {
    console.info('[MoodClassifier] Model unavailable, using lexicon fallback.', err);
    loadFailed = true;
    loading = false;
    return false;
  }
}

// ── Tokenizer (mirrors train_mood_model.py logic) ────────────────────────────

function tokenize(text: string): Int32Array {
  const oovIdx = vocab?.['<OOV>'] ?? 1;
  const padIdx = vocab?.['<PAD>'] ?? 0;

  const cleaned = text
    .toLowerCase()
    .replace(/http\S+|www\S+/g, ' ')
    .replace(/@\w+/g, ' ')
    .replace(/[^a-z0-9\s']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const tokens = cleaned.split(' ').filter(Boolean);
  const indices = tokens.map(t => vocab?.[t] ?? oovIdx);

  // Pre-pad to MAX_SEQUENCE_LENGTH
  const seq = new Int32Array(MAX_SEQUENCE_LENGTH).fill(padIdx);
  const start = Math.max(0, indices.length - MAX_SEQUENCE_LENGTH);
  const offset = Math.max(0, MAX_SEQUENCE_LENGTH - indices.length);
  for (let i = start; i < indices.length; i++) {
    seq[offset + (i - start)] = indices[i];
  }
  return seq;
}

// ── ONNX inference ───────────────────────────────────────────────────────────

async function predictWithModel(text: string): Promise<MoodPrediction | null> {
  const loaded = await loadModel();
  if (!loaded || !session) return null;

  try {
    const tokens = tokenize(text);

    // onnxruntime-web expects a BigInt64Array for int32 on some backends;
    // use INT32 tensor explicitly
    const inputTensor = new ort.Tensor('int32', tokens, [1, MAX_SEQUENCE_LENGTH]);

    // The input name comes from the saved model; fallback to first available
    const inputName = session.inputNames[0];
    const feeds: Record<string, ort.Tensor> = { [inputName]: inputTensor };

    const results = await session.run(feeds);
    const outputName = session.outputNames[0];
    const outputData = results[outputName].data as Float32Array;

    const allScores = {} as Record<MoodType, number>;
    MOOD_LABELS.forEach((label, i) => { allScores[label] = outputData[i]; });

    const maxIdx = Array.from(outputData).reduce(
      (best, val, idx) => val > outputData[best] ? idx : best, 0
    );

    return {
      mood: MOOD_LABELS[maxIdx],
      confidence: outputData[maxIdx],
      allScores,
    };
  } catch (err) {
    console.error('[MoodClassifier] Inference error:', err);
    return null;
  }
}

// ── Rule-based lexicon fallback ───────────────────────────────────────────────

function predictWithLexicon(text: string): MoodPrediction {
  const lower = text.toLowerCase();

  const lexicon: Record<MoodType, string[]> = {
    happy: [
      'happy', 'joy', 'joyful', 'excited', 'wonderful', 'amazing', 'great', 'fantastic',
      'love', 'loved', 'grateful', 'thankful', 'blessed', 'smile', 'smiling', 'laugh',
      'laughing', 'fun', 'delight', 'delighted', 'pleased', 'cheerful', 'glad', 'positive',
      'optimistic', 'hopeful', 'beautiful', 'lovely', 'awesome', 'brilliant', 'celebrate',
      'celebration', 'proud', 'pride', 'admire', 'enjoy', 'enjoying', 'thrilled',
      'elated', 'ecstatic', 'content', 'satisfied', 'fulfilled', 'relief', 'relieved',
    ],
    sad: [
      'sad', 'unhappy', 'depressed', 'depression', 'cry', 'crying', 'tears', 'grief',
      'heartbroken', 'lonely', 'alone', 'miss', 'missing', 'loss', 'lost', 'disappointed',
      'disappointment', 'hurt', 'pain', 'painful', 'sorrow', 'sorrowful', 'melancholy',
      'hopeless', 'helpless', 'worthless', 'empty', 'broken', 'devastated', 'miserable',
      'suffering', 'regret', 'ashamed', 'shame', 'guilt', 'guilty', 'remorse',
      'mourn', 'mourning', 'gloomy', 'heartache', 'scared', 'afraid', 'fearful',
    ],
    productive: [
      'productive', 'accomplished', 'achievement', 'success', 'succeeded', 'done', 'finished',
      'completed', 'organized', 'focused', 'efficient', 'goal', 'goals', 'progress',
      'work', 'worked', 'working', 'task', 'tasks', 'project', 'deadline', 'plan',
      'planned', 'schedule', 'motivated', 'motivation', 'determined', 'disciplined',
      'committed', 'building', 'created', 'developed', 'learned', 'study', 'studying',
      'solving', 'solved', 'improving', 'improved', 'curious', 'realized', 'discovered',
    ],
    tired: [
      'tired', 'exhausted', 'exhaustion', 'fatigue', 'fatigued', 'sleepy', 'sleep',
      'sleeping', 'drained', 'burnout', 'burned out', 'overworked', 'overwhelmed',
      'stressed', 'stress', 'weary', 'nap', 'rest', 'yawn', 'sluggish', 'lazy',
      'no energy', 'low energy', 'brain fog', 'need sleep', 'drowsy', 'lethargic',
      'slow', 'weak', 'lifeless', 'nervous', 'anxious', 'anxiety', 'confused', 'lost',
    ],
    neutral: [
      'okay', 'ok', 'fine', 'alright', 'normal', 'usual', 'regular', 'average',
      'nothing special', 'just another', 'moderate', 'meh', 'indifferent', 'whatever',
      'simply', 'plain', 'ordinary', 'typical', 'standard', 'routine', 'daily',
      'balanced', 'stable', 'steady', 'calm', 'quiet', 'peaceful',
    ],
    angry: [
      'angry', 'anger', 'furious', 'rage', 'frustrated', 'frustrating', 'frustration',
      'annoyed', 'annoying', 'irritated', 'mad', 'upset', 'hate', 'hated', 'hating',
      'resentment', 'resent', 'bitter', 'hostile', 'aggression', 'aggressive',
      'fighting', 'fight', 'argue', 'arguing', 'argument', 'outrage', 'outraged',
      'disgusted', 'disgust', 'ridiculous', 'unfair', 'betrayed', 'betrayal',
      'disrespected', 'offended', 'infuriated', 'enraged',
    ],
  };

  const scores = { happy: 0, sad: 0, productive: 0, tired: 0, neutral: 0, angry: 0 } as Record<MoodType, number>;

  for (const [mood, keywords] of Object.entries(lexicon) as [MoodType, string[]][]) {
    for (const kw of keywords) {
      const matches = lower.match(new RegExp(`\\b${kw}\\b`, 'gi'));
      if (matches) scores[mood] += matches.length;
    }
  }

  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  const allScores = {} as Record<MoodType, number>;

  if (total === 0) {
    MOOD_LABELS.forEach(m => { allScores[m] = m === 'neutral' ? 1 : 0; });
    return { mood: 'neutral', confidence: 0.5, allScores };
  }

  MOOD_LABELS.forEach(m => { allScores[m] = scores[m] / total; });
  const best = MOOD_LABELS.reduce((a, b) => allScores[a] > allScores[b] ? a : b);
  return { mood: best, confidence: allScores[best], allScores };
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function predictMood(text: string): Promise<MoodPrediction> {
  if (!text || text.trim().length < 3) {
    return {
      mood: 'neutral',
      confidence: 0.5,
      allScores: { happy: 0, sad: 0, productive: 0, tired: 0, neutral: 1, angry: 0 },
    };
  }

  const result = await predictWithModel(text);
  return result ?? predictWithLexicon(text);
}

/** Pre-warm the ONNX session in the background (call on app start). */
export function warmUpModel(): void {
  loadModel().then(loaded => {
    if (loaded && session) {
      const dummy = tokenize('warm up prediction text');
      const tensor = new ort.Tensor('int32', dummy, [1, MAX_SEQUENCE_LENGTH]);
      session.run({ [session.inputNames[0]]: tensor })
        .then(() => console.log('[MoodClassifier] ONNX session warmed up'))
        .catch(() => {});
    }
  });
}

export { MOOD_LABELS };
