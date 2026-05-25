# New Project Brief

Fill every section below.
Write as if explaining to a new employee — plain language only.
No technical terms needed.

## 1. What do you want to build?
A fully local, browser-based AI Text-to-Speech machine that converts Japanese novels into natural, human-like audio using a downloaded AI voice model. The user picks a model that fits their computer's power, loads a PDF or EPUB novel file, and listens to it read aloud — entirely offline.

## 2. What problem does it solve?
Currently, there are many TTS tools available, but most of them are not free and require an internet connection. Also, the quality of the audio is not very good and the voice is not natural. This problem also for user who can hear and understand Japanese with their ears but can't read it.

## 3. Who uses it?
A user who loves stories and understands Japanese passively. They have a desktop PC — ranging from a budget machine with a CPU only up to a gaming PC with a modern GPU (e.g. RTX 2060 or better). They are not developers; they should not need to touch the command line.

## 4. What should it NOT do?
- Access the internet or use cloud services at runtime (model download from Hugging Face is a one-time setup step, not a runtime call).
- Require the user to install Python, Node.js, or any developer tool.
- Support languages other than Japanese in this version.
- Translate, summarise, or modify the novel text.

## 5. What does "done" look like?
The user can:
1. Download a voice model once (from Hugging Face or similar) and point the app to it.
2. Load a PDF or EPUB Japanese novel file.
3. Press play and hear the novel read aloud in a natural Japanese voice.
4. Choose whether to use their CPU or GPU for generation.
5. Export or save the generated audio to a file.

## 6. Any tools, platforms, or formats you already know you want?
- **Browser:** Chrome or Edge (local file, no server needed).
- **TTS engine:** A local AI model downloaded from Hugging Face. Three tiers must be offered:
  - **A. BIS (Balanced/Recommended):** Best quality-to-performance ratio for most users.
  - **B. Low-budget / Potato:** Runs on weak hardware, still acceptable quality.
  - **C. Overpowered:** Highest quality, needs a strong desktop GPU (minimum ~RTX 2060, 6GB VRAM).
- **Input formats:** PDF and EPUB (primary). Plain text (.txt) as fallback.
- **Compute:** User can choose CPU or GPU (CUDA) for inference.
- **GPU baseline:** RTX 2060 with 6GB VRAM is the lowest-end GPU target for the Overpowered tier.