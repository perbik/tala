# TALA — Affective Computing Journal

A full-stack AI-powered journaling app with real-time mood detection built on the **GoEmotions** dataset from Google Research.

## Tech Stack
- **Frontend**: React 18 + TypeScript + Tailwind CSS + Vite
- **AI/ML**: TensorFlow.js (browser-side inference) + Python/Keras (training)
- **Dataset**: [GoEmotions](https://github.com/google-research/google-research/tree/master/goemotions) (58k Reddit comments, 27 emotions)
- **Architecture**: Attention-enhanced Bidirectional LSTM

## Mood Classes
| Mood | GoEmotions Categories Mapped |
|------|------------------------------|
| 😊 **Happy** | admiration, amusement, approval, caring, desire, excitement, gratitude, joy, love, optimism, pride, relief |
| 😢 **Sad** | sadness, grief, disappointment, embarrassment, remorse, fear |
| ⚡ **Productive** | curiosity, realization, surprise |
| 🌙 **Tired** | nervousness, confusion |
| ⛅ **Neutral** | neutral |
| 🔥 **Angry** | anger, annoyance, disapproval, disgust |

## Step 1: Train the Model

```bash
# Install training dependencies
pip install -r requirements_train.txt

# Run training (auto-downloads GoEmotions dataset)
python train_mood_model.py
```

This will:
1. Download the 3 GoEmotions CSV files from Google Research GitHub
2. Map 27 emotions → 6 mood classes
3. Train a BiLSTM model with attention (~20 epochs, early stopping)
4. Export to `public/model/` as TF.js format
5. Save `public/model/vocab.json` for browser tokenization

## Step 2: Run the Website

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Step 3: Use the App

1. Click any date on the calendar → Write your journal entry
2. The AI auto-detects your mood as you type (after 20+ characters)
3. Override mood manually using the mood chips
4. Save → the calendar shows a colored dot for that day
5. Mood colors reflect your emotional state across the month

## Project Structure

```
journal-mood/
├── src/
│   ├── components/
│   │   ├── Calendar.tsx        # Mood-colored calendar
│   │   ├── JournalPanel.tsx    # View/edit journal entries
│   │   ├── MoodSelector.tsx    # Mood picker UI
│   │   ├── MoodBadge.tsx       # Mood display badge
│   │   ├── SearchBar.tsx       # Full-text search
│   │   └── StatsBar.tsx        # Mood distribution stats
│   ├── services/
│   │   ├── moodClassifier.ts   # TF.js model + lexicon fallback
│   │   └── journalStorage.ts   # localStorage CRUD
│   ├── hooks/
│   │   └── useJournal.ts       # Journal state management
│   ├── types/index.ts
│   └── constants/moods.ts
├── train_mood_model.py         # GoEmotions training pipeline
├── requirements_train.txt
└── public/model/               # Trained model goes here
    ├── model.json
    ├── vocab.json
    └── metadata.json
```
