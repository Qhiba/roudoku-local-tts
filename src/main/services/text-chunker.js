// ADDED: Japanese sentence chunker — splits on 。！？\n with comma fallback and token-count hard cap

/**
 * Splits Japanese novel text into chunks of maximum token length (character count approximation).
 * Splits primarily on sentence boundaries (。！？\n).
 * If a sentence exceeds maxTokens, it falls back to comma boundaries (、，,).
 * If still too long, it hard-splits at maxTokens with an isForcedSplit flag.
 *
 * @param {string} text - The input text to chunk.
 * @param {number} maxTokens - Maximum character length allowed for each chunk.
 * @returns {Array<{text: string, isForcedSplit: boolean}>}
 */
function chunkText(text, maxTokens = 256) {
  if (!text) return [];

  // Split on sentence ends (。！？\n) while retaining the punctuation marks.
  const sentences = text.split(/(?<=[。！？\n])/g);
  const chunks = [];

  for (let sentence of sentences) {
    sentence = sentence.trim();
    if (!sentence) continue;

    if (sentence.length <= maxTokens) {
      chunks.push({ text: sentence, isForcedSplit: false });
    } else {
      // Split on punctuation pauses (、，,)
      const subparts = sentence.split(/(?<=[、，,])/g);
      let currentChunk = '';

      for (let subpart of subparts) {
        if ((currentChunk + subpart).length <= maxTokens) {
          currentChunk += subpart;
        } else {
          if (currentChunk) {
            chunks.push({ text: currentChunk, isForcedSplit: false });
          }
          currentChunk = subpart;

          // If a single subpart is larger than maxTokens, slice it
          while (currentChunk.length > maxTokens) {
            chunks.push({
              text: currentChunk.slice(0, maxTokens),
              isForcedSplit: true
            });
            currentChunk = currentChunk.slice(maxTokens);
          }
        }
      }

      if (currentChunk) {
        chunks.push({ text: currentChunk, isForcedSplit: false });
      }
    }
  }

  return chunks;
}

module.exports = { chunkText };
