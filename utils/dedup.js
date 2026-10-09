'use strict';

const mongoose = require('mongoose');

const TTL_SECONDS = 30;
const COLLECTION = 'processed_messages';

let _collection = null;
let _indexed = false;

async function _getCol() {
  if (_collection) return _collection;
  try {
    if (!mongoose.connection.db) return null;
    _collection = mongoose.connection.db.collection(COLLECTION);
    if (!_indexed) {
      await _collection.createIndex({ ts: 1 }, { expireAfterSeconds: TTL_SECONDS, background: true }).catch(() => {});
      _indexed = true;
    }
    return _collection;
  } catch {
    return null;
  }
}

async function tryClaim(id) {
  try {
    const col = await _getCol();
    if (!col) return true;
    await col.insertOne({ _id: id, ts: new Date() });
    return true;
  } catch (err) {
    if (err?.code === 11000) return false;
    return true;
  }
}

module.exports = { tryClaim };
