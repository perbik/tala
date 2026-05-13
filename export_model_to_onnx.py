#!/usr/bin/env python3
"""
Quick export of existing trained model to ONNX format.
Skips training — just loads the pre-trained model and converts it.
"""

import os
import json
import pathlib
import pickle
import tensorflow as tf
import tf2onnx
import tf2onnx.convert

# Configuration
MODEL_OUTPUT_DIR = pathlib.Path("public/model")
DATASET_DIR = pathlib.Path("dataset")
MAX_SEQUENCE_LENGTH = 100

def export_to_onnx():
    """Load existing trained model and export to ONNX."""
    
    # Load the best trained model
    keras_model_path = DATASET_DIR / "best_model.keras"
    if not keras_model_path.exists():
        print(f"❌ Model not found: {keras_model_path}")
        return False
    
    print(f"📦 Loading model from: {keras_model_path}")
    # Allow unsafe deserialization for custom Lambda layers
    tf.keras.config.enable_unsafe_deserialization()
    model = tf.keras.models.load_model(keras_model_path)
    
    # Try to load vocab
    vocab_pickle_path = DATASET_DIR / "vocab.pkl"
    if vocab_pickle_path.exists():
        print(f"📚 Loading vocabulary from: {vocab_pickle_path}")
        with open(vocab_pickle_path, 'rb') as f:
            word_index = pickle.load(f)
        vocab = {word: idx for word, idx in word_index.items()}
    else:
        print(f"⚠️  vocab.pkl not found. Using default vocabulary.")
        vocab = {}
    
    # Create output directory
    MODEL_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    # Convert to ONNX
    onnx_path = MODEL_OUTPUT_DIR / "mood_model.onnx"
    print(f"\n🔄 Converting to ONNX format...")
    
    input_signature = [
        tf.TensorSpec(
            shape=[None, MAX_SEQUENCE_LENGTH],
            dtype=tf.int32,
            name="input_tokens"
        )
    ]
    
    try:
        onnx_model, _ = tf2onnx.convert.from_keras(
            model,
            input_signature=input_signature,
            opset=13,
            output_path=str(onnx_path)
        )
        print(f"✅ ONNX model saved to: {onnx_path}")
    except Exception as e:
        print(f"❌ ONNX conversion failed: {e}")
        return False
    
    # Save vocab.json
    if vocab:
        vocab_json_path = MODEL_OUTPUT_DIR / "vocab.json"
        with open(vocab_json_path, 'w') as f:
            json.dump(vocab, f)
        print(f"✅ Vocabulary saved to: {vocab_json_path}")
    else:
        print(f"⚠️  Empty vocabulary. Please check dataset/vocab.pkl")
    
    # Save metadata
    metadata = {
        "model_type": "BiLSTM",
        "moods": ["happy", "sad", "productive", "tired", "neutral", "angry"],
        "max_sequence_length": MAX_SEQUENCE_LENGTH,
        "vocab_size": len(vocab),
        "exported_from": str(keras_model_path)
    }
    metadata_path = MODEL_OUTPUT_DIR / "metadata.json"
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    print(f"✅ Metadata saved to: {metadata_path}")
    
    print("\n🎉 Export complete!")
    return True

if __name__ == "__main__":
    export_to_onnx()
