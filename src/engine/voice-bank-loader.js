// ADDED: voice bank loader — reads speakers.json/config.json; returns [{id, name}] array

const fs = require('fs');
const path = require('path');

/**
 * Scans the model directory for speakers.json or config.json metadata
 * to extract speaker indices and names.
 *
 * @param {string} modelDir - Directory containing the model file.
 * @returns {Array<{id: number, name: string}>}
 */
function loadVoiceBanks(modelDir) {
  try {
    const speakersPath = path.join(modelDir, 'speakers.json');
    const configPath = path.join(modelDir, 'config.json');

    if (fs.existsSync(speakersPath)) {
      const raw = fs.readFileSync(speakersPath, 'utf8');
      const data = JSON.parse(raw);
      
      if (Array.isArray(data)) {
        return data.map((name, idx) => ({ id: idx, name: String(name) }));
      } else if (typeof data === 'object') {
        return Object.entries(data).map(([id, name]) => ({ id: parseInt(id, 10), name: String(name) }));
      }
    }

    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(raw);
      
      if (config.speakers && Array.isArray(config.speakers)) {
        return config.speakers.map((sp, idx) => ({
          id: typeof sp.id === 'number' ? sp.id : idx,
          name: sp.name || `Speaker ${sp.id || idx}`
        }));
      } else if (config.speaker_id_map && typeof config.speaker_id_map === 'object') {
        return Object.entries(config.speaker_id_map).map(([name, id]) => ({
          id: parseInt(id, 10),
          name: String(name)
        }));
      }
    }
  } catch (error) {
    console.error('Error loading voice banks metadata:', error);
  }

  // Default fallback if no speaker lists are found
  return [{ id: 0, name: 'Default' }];
}

module.exports = { loadVoiceBanks };
