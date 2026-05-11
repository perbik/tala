#!/usr/bin/env python3
"""
MoodJournal - Affective Computing Model Trainer
================================================
Trains a Bidirectional LSTM model on the GoEmotions dataset from Google Research.
Maps GoEmotions' 27 emotion categories to 6 mood classes:
  happy, sad, productive, tired, neutral, angry

Usage:
  pip install -r requirements_train.txt
  python train_mood_model.py

Output:
  public/model/mood_model.onnx  (ONNX format, loaded by onnxruntime-web)
  public/model/vocab.json       (vocabulary for browser tokenizer)
  public/model/metadata.json

No TensorFlow.js needed in the browser — uses onnxruntime-web instead.
"""

import os
import sys
import json
import re
import urllib.request
import zipfile
import pathlib
import numpy as np
from collections import Counter

# ── Configuration ──────────────────────────────────────────────────────────────

MODEL_OUTPUT_DIR = pathlib.Path("public/model")
DATASET_DIR = pathlib.Path("dataset")
MAX_VOCAB_SIZE = 15000
MAX_SEQUENCE_LENGTH = 100
EMBEDDING_DIM = 128
LSTM_UNITS = 128
DROPOUT_RATE = 0.35
BATCH_SIZE = 64
EPOCHS = 10
LEARNING_RATE = 0.001

# GoEmotions → 6 mood mapping
EMOTION_TO_MOOD = {
    # happy
    "admiration":    "happy",
    "amusement":     "happy",
    "approval":      "happy",
    "caring":        "happy",
    "desire":        "happy",
    "excitement":    "happy",
    "gratitude":     "happy",
    "joy":           "happy",
    "love":          "happy",
    "optimism":      "happy",
    "pride":         "happy",
    "relief":        "happy",
    # sad
    "sadness":       "sad",
    "grief":         "sad",
    "disappointment": "sad",
    "embarrassment": "sad",
    "remorse":       "sad",
    "fear":          "sad",     # grouped into sad for simplicity
    # productive
    "curiosity":     "productive",
    "realization":   "productive",
    "surprise":      "productive",
    # tired
    "nervousness":   "tired",
    "confusion":     "tired",
    # angry
    "anger":         "angry",
    "annoyance":     "angry",
    "disapproval":   "angry",
    "disgust":       "angry",
    # neutral
    "neutral":       "neutral",
}

MOOD_LABELS = ["happy", "sad", "productive", "tired", "neutral", "angry"]
MOOD_TO_IDX = {m: i for i, m in enumerate(MOOD_LABELS)}

GOEMOTIONS_URLS = [
    "https://storage.googleapis.com/gresearch/goemotions/data/full_dataset/goemotions_1.csv",
    "https://storage.googleapis.com/gresearch/goemotions/data/full_dataset/goemotions_2.csv",
    "https://storage.googleapis.com/gresearch/goemotions/data/full_dataset/goemotions_3.csv",
]

# ── Data Download ──────────────────────────────────────────────────────────────

def download_dataset():
    """Download GoEmotions dataset from Google Research GitHub."""
    DATASET_DIR.mkdir(parents=True, exist_ok=True)
    files = []
    for i, url in enumerate(GOEMOTIONS_URLS, 1):
        path = DATASET_DIR / f"goemotions_{i}.csv"
        if path.exists():
            print(f"  [cached] {path.name}")
        else:
            print(f"  Downloading goemotions_{i}.csv...")
            try:
                urllib.request.urlretrieve(url, path)
                print(f"  Downloaded {path.name}")
            except Exception as e:
                print(f"  ERROR downloading {url}: {e}")
                sys.exit(1)
        files.append(path)
    return files


# ── Data Loading ───────────────────────────────────────────────────────────────

GOEMOTIONS_COLUMNS = [
    "text", "id", "author", "subreddit", "link_id", "parent_id",
    "created_utc", "rater_id", "example_very_unclear",
    "admiration", "amusement", "anger", "annoyance", "approval",
    "caring", "confusion", "curiosity", "desire", "disappointment",
    "disapproval", "disgust", "embarrassment", "excitement", "fear",
    "gratitude", "grief", "joy", "love", "nervousness", "optimism",
    "pride", "realization", "relief", "remorse", "sadness", "surprise", "neutral"
]

EMOTION_COLS = GOEMOTIONS_COLUMNS[9:]  # 28 emotion columns


def load_dataset(csv_files):
    """Parse GoEmotions CSV files and map emotions to mood labels."""
    texts, moods = [], []

    for path in csv_files:
        print(f"  Loading {path.name}...")
        with open(path, encoding="utf-8") as f:
            header = f.readline()  # skip header
            for line in f:
                # Handle quoted fields containing commas
                fields = parse_csv_line(line)
                if len(fields) < len(GOEMOTIONS_COLUMNS):
                    continue

                text = fields[0].strip().strip('"')
                if not text:
                    continue

                # Get active emotions (columns 9+)
                active_emotions = []
                for i, col in enumerate(EMOTION_COLS):
                    try:
                        val = fields[9 + i].strip()
                        if val == "1":
                            active_emotions.append(col)
                    except IndexError:
                        pass

                if not active_emotions:
                    continue

                # Map to mood via voting
                mood_votes = Counter()
                for em in active_emotions:
                    m = EMOTION_TO_MOOD.get(em)
                    if m:
                        mood_votes[m] += 1

                if not mood_votes:
                    continue

                # Pick the majority mood
                dominant = mood_votes.most_common(1)[0][0]
                texts.append(text)
                moods.append(MOOD_TO_IDX[dominant])

    print(f"  Total samples: {len(texts)}")
    # Print distribution
    dist = Counter(MOOD_LABELS[m] for m in moods)
    for m, c in sorted(dist.items()):
        print(f"    {m}: {c} ({c/len(moods)*100:.1f}%)")

    return texts, moods


def parse_csv_line(line):
    """Simple CSV parser handling quoted fields."""
    fields = []
    current = ""
    in_quotes = False
    for ch in line:
        if ch == '"':
            in_quotes = not in_quotes
        elif ch == ',' and not in_quotes:
            fields.append(current)
            current = ""
        elif ch == '\n' and not in_quotes:
            break
        else:
            current += ch
    fields.append(current)
    return fields


# ── Text Processing ────────────────────────────────────────────────────────────

def clean_text(text):
    """Clean and normalize text."""
    text = text.lower()
    text = re.sub(r"http\S+|www\S+", " ", text)
    text = re.sub(r"@\w+", " ", text)
    text = re.sub(r"[^a-z0-9\s']", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def build_vocab(texts, max_vocab_size):
    """Build vocabulary from texts."""
    counter = Counter()
    for text in texts:
        tokens = clean_text(text).split()
        counter.update(tokens)

    vocab = {"<PAD>": 0, "<OOV>": 1}
    for word, _ in counter.most_common(max_vocab_size - 2):
        vocab[word] = len(vocab)

    return vocab


def texts_to_sequences(texts, vocab, max_len):
    """Convert texts to padded integer sequences."""
    oov = vocab.get("<OOV>", 1)
    pad = vocab.get("<PAD>", 0)
    seqs = []
    for text in texts:
        tokens = clean_text(text).split()
        indices = [vocab.get(t, oov) for t in tokens]
        # Pre-padding
        if len(indices) >= max_len:
            indices = indices[-max_len:]
        else:
            indices = [pad] * (max_len - len(indices)) + indices
        seqs.append(indices)
    return np.array(seqs, dtype=np.int32)


# ── Model Architecture ─────────────────────────────────────────────────────────

def build_model(vocab_size, num_classes):
    """Build Bidirectional LSTM model exportable to ONNX.

    Notes:
    - mask_zero=False on Embedding: ONNX export doesn't support Keras masking.
      Padding tokens (index 0) are handled implicitly — the model learns to
      ignore them via the BiLSTM state. Accuracy impact is minimal.
    - No Lambda layers: tf2onnx can't trace Python lambdas reliably.
      We use GlobalAveragePooling1D instead of manual attention sum.
    - SpatialDropout1D replaced with standard Dropout (ONNX-safe).
    """
    import tensorflow as tf
    from tensorflow import keras
    from tensorflow.keras import layers

    inputs = keras.Input(shape=(MAX_SEQUENCE_LENGTH,), dtype="int32", name="input_tokens")

    # Embedding (no mask_zero — not ONNX-exportable)
    x = layers.Embedding(
        input_dim=vocab_size,
        output_dim=EMBEDDING_DIM,
        name="embedding"
    )(inputs)

    x = layers.Dropout(0.2)(x)

    # Bidirectional LSTM stack
    x = layers.Bidirectional(
        layers.LSTM(LSTM_UNITS, return_sequences=True, dropout=DROPOUT_RATE),
        name="bilstm_1"
    )(x)

    x = layers.Bidirectional(
        layers.LSTM(LSTM_UNITS // 2, return_sequences=True, dropout=DROPOUT_RATE),
        name="bilstm_2"
    )(x)

    # Attention: score each timestep, softmax, weighted sum
    # All ops are ONNX-compatible (no Lambda, no masking)
    attn_scores = layers.Dense(1, activation="tanh", name="attn_score")(x)  # (B, T, 1)
    attn_weights = layers.Softmax(axis=1, name="attn_weights")(attn_scores)  # (B, T, 1)
    x = layers.Multiply(name="attn_apply")([x, attn_weights])               # (B, T, H)
    x = layers.GlobalAveragePooling1D(name="attn_pool")(x)                  # (B, H)

    # Dense head
    x = layers.Dense(256, activation="relu")(x)
    x = layers.Dropout(DROPOUT_RATE)(x)
    x = layers.Dense(128, activation="relu")(x)
    x = layers.Dropout(DROPOUT_RATE / 2)(x)

    outputs = layers.Dense(num_classes, activation="softmax", name="output")(x)

    model = keras.Model(inputs=inputs, outputs=outputs)
    return model


# ── Training ───────────────────────────────────────────────────────────────────

def train():
    """Full training pipeline."""
    import tensorflow as tf

    print("\n═══════════════════════════════════════════")
    print("  MoodJournal Model Trainer")
    print("  Dataset: GoEmotions (Google Research)")
    print("═══════════════════════════════════════════\n")

    # 1. Download data
    print("[1/6] Downloading GoEmotions dataset...")
    csv_files = download_dataset()

    # 2. Load data
    print("\n[2/6] Loading and mapping emotions to moods...")
    texts, labels = load_dataset(csv_files)

    # 3. Build vocabulary
    print("\n[3/6] Building vocabulary...")
    vocab = build_vocab(texts, MAX_VOCAB_SIZE)
    print(f"  Vocabulary size: {len(vocab)}")

    # 4. Encode sequences
    print("\n[4/6] Encoding sequences...")
    X = texts_to_sequences(texts, vocab, MAX_SEQUENCE_LENGTH)
    y = np.array(labels, dtype=np.int32)
    y_cat = tf.keras.utils.to_categorical(y, num_classes=len(MOOD_LABELS))

    # Train/val split (90/10)
    n = len(X)
    idx = np.random.permutation(n)
    split = int(n * 0.9)
    train_idx, val_idx = idx[:split], idx[split:]
    X_train, X_val = X[train_idx], X[val_idx]
    y_train, y_val = y_cat[train_idx], y_cat[val_idx]
    print(f"  Train: {len(X_train)}  Val: {len(X_val)}")

    # Class weights for imbalanced data
    class_counts = Counter(y.tolist())
    max_count = max(class_counts.values())
    class_weights = {i: max_count / class_counts.get(i, 1) for i in range(len(MOOD_LABELS))}
    print("  Class weights:", {MOOD_LABELS[k]: f"{v:.2f}" for k, v in class_weights.items()})

    # 5. Build and train model
    print("\n[5/6] Building model...")
    model = build_model(len(vocab), len(MOOD_LABELS))
    model.summary()

    optimizer = tf.keras.optimizers.Adam(learning_rate=LEARNING_RATE)
    model.compile(
        optimizer=optimizer,
        loss="categorical_crossentropy",
        metrics=["accuracy"]
    )

    callbacks = [
        tf.keras.callbacks.EarlyStopping(
            monitor="val_accuracy",
            patience=4,
            restore_best_weights=True,
            verbose=1
        ),
        tf.keras.callbacks.ReduceLROnPlateau(
            monitor="val_loss",
            factor=0.5,
            patience=2,
            verbose=1
        ),
        tf.keras.callbacks.ModelCheckpoint(
            filepath=str(DATASET_DIR / "best_model.keras"),
            monitor="val_accuracy",
            save_best_only=True,
            verbose=0
        )
    ]

    print(f"\n  Training for up to {EPOCHS} epochs (batch={BATCH_SIZE})...")
    history = model.fit(
        X_train, y_train,
        validation_data=(X_val, y_val),
        epochs=EPOCHS,
        batch_size=BATCH_SIZE,
        class_weight=class_weights,
        callbacks=callbacks,
        verbose=1
    )

    # Evaluate
    val_loss, val_acc = model.evaluate(X_val, y_val, verbose=0)
    print(f"\n  Final validation accuracy: {val_acc:.4f} ({val_acc*100:.1f}%)")

    # 6. Export to ONNX
    print("\n[6/6] Exporting to ONNX format...")
    MODEL_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Save Keras model (.keras) as a backup
    keras_path = DATASET_DIR / "mood_model.keras"
    model.save(keras_path)
    print(f"  Keras model saved to: {keras_path}")

    # Convert to ONNX via tf2onnx
    onnx_path = MODEL_OUTPUT_DIR / "mood_model.onnx"
    try:
        import tf2onnx
        import tf2onnx.convert
        import onnx

        # Build a concrete input signature for the converter
        input_signature = [
            tf.TensorSpec(
                shape=[None, MAX_SEQUENCE_LENGTH],
                dtype=tf.int32,
                name="input_tokens"
            )
        ]
        onnx_model, _ = tf2onnx.convert.from_keras(
            model,
            input_signature=input_signature,
            opset=13,
            output_path=str(onnx_path),
        )
        print(f"  ONNX model saved to: {onnx_path}")
    except ImportError:
        print("  tf2onnx not found. Install with: pip install tf2onnx onnx")
        print("  Or convert manually:")
        print(f"    python -m tf2onnx.convert --keras {keras_path} --output {onnx_path} --opset 13")
    except Exception as e:
        print(f"  ONNX conversion error: {e}")
        print(f"  The Keras model is still saved at: {keras_path}")

    # Save vocabulary
    vocab_path = MODEL_OUTPUT_DIR / "vocab.json"
    with open(vocab_path, "w", encoding="utf-8") as f:
        json.dump(vocab, f, ensure_ascii=False, separators=(",", ":"))
    print(f"  Vocabulary saved to: {vocab_path}")

    # Save metadata
    meta = {
        "mood_labels": MOOD_LABELS,
        "max_sequence_length": MAX_SEQUENCE_LENGTH,
        "vocab_size": len(vocab),
        "embedding_dim": EMBEDDING_DIM,
        "lstm_units": LSTM_UNITS,
        "val_accuracy": float(val_acc),
        "val_loss": float(val_loss),
        "epochs_trained": len(history.history["val_accuracy"]),
        "training_samples": len(X_train),
        "emotion_to_mood_mapping": EMOTION_TO_MOOD,
        "dataset": "GoEmotions (Google Research)",
        "export_format": "onnx",
        "onnx_opset": 13,
    }
    meta_path = MODEL_OUTPUT_DIR / "metadata.json"
    with open(meta_path, "w") as f:
        json.dump(meta, f, indent=2)
    print(f"  Metadata saved to: {meta_path}")

    print("\n✓ Training complete!")
    print(f"  Validation accuracy: {val_acc*100:.1f}%")
    print(f"  ONNX model: {onnx_path}")
    print(f"  Vocab:      {vocab_path}")
    print(f"\n  Start the app with: npm run dev")
    print("  The React app loads mood_model.onnx via onnxruntime-web (no TF.js needed).")


if __name__ == "__main__":
    train()
