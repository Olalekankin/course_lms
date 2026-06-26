const fs = require('fs').promises;
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'db.json');

// Queue writes sequentially to prevent concurrent file access corruption
let writeQueue = Promise.resolve();

async function readDb() {
  try {
    const data = await fs.readFile(dbPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('[DB Helper] Error reading database:', error);
    return { users: [] };
  }
}

async function writeDb(data) {
  return new Promise((resolve, reject) => {
    writeQueue = writeQueue.then(async () => {
      try {
        await fs.writeFile(dbPath, JSON.stringify(data, null, 2), 'utf8');
        resolve();
      } catch (error) {
        console.error('[DB Helper] Error writing database:', error);
        reject(error);
      }
    });
  });
}

module.exports = {
  readDb,
  writeDb
};
