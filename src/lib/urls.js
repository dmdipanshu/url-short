import getClientPromise from './mongodb';
import { nanoid } from 'nanoid';

const DB_NAME = 'urlshortener';
const COLLECTION_NAME = 'urls';

async function getCollection() {
  const client = await getClientPromise();
  const db = client.db(DB_NAME);
  return db.collection(COLLECTION_NAME);
}

/**
 * Ensure indexes exist for fast lookups
 */
export async function ensureIndexes() {
  const collection = await getCollection();
  await collection.createIndex({ code: 1 }, { unique: true });
  await collection.createIndex({ createdAt: -1 });
  // TTL index: auto-delete expired docs 30 days after expiry
  await collection.createIndex(
    { expiresAt: 1 },
    { expireAfterSeconds: 2592000, partialFilterExpression: { expiresAt: { $exists: true, $ne: null } } }
  );
}

/**
 * Create a short URL
 * @param {string} originalUrl - The original long URL
 * @param {Object} options - Optional settings
 * @param {string} [options.customAlias] - Custom short code
 * @param {Date|null} [options.expiresAt] - Expiry date
 * @param {string|null} [options.password] - Password protection
 * @returns {Object} The created URL document
 */
export async function createShortUrl(originalUrl, options = {}) {
  const collection = await getCollection();
  const { customAlias, expiresAt, password } = options;

  // Use custom alias or generate a nanoid (7 chars)
  const code = customAlias || nanoid(7);

  // Check if custom alias already exists
  if (customAlias) {
    const existing = await collection.findOne({ code: customAlias });
    if (existing) {
      throw new Error('This alias is already taken. Please choose another one.');
    }
  }

  const doc = {
    code,
    originalUrl,
    clicks: 0,
    createdAt: new Date(),
    lastClickedAt: null,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
    password: password || null,
  };

  await collection.insertOne(doc);
  return doc;
}

/**
 * Get URL info for redirect (checks expiry + password)
 * @param {string} code - The short code
 * @returns {Object} { url, expired, passwordRequired }
 */
export async function getRedirectInfo(code) {
  const collection = await getCollection();

  const doc = await collection.findOne(
    { code },
    { projection: { originalUrl: 1, expiresAt: 1, password: 1 } }
  );

  if (!doc) return { url: null };

  // Check if expired
  if (doc.expiresAt && new Date(doc.expiresAt) < new Date()) {
    return { url: null, expired: true };
  }

  // Check if password protected
  if (doc.password) {
    return { url: null, passwordRequired: true };
  }

  // Increment clicks atomically
  await collection.updateOne(
    { code },
    { $inc: { clicks: 1 }, $set: { lastClickedAt: new Date() } }
  );

  return { url: doc.originalUrl };
}

/**
 * Verify password and get URL
 * @param {string} code - The short code
 * @param {string} password - Password to verify
 * @returns {Object} { url, error }
 */
export async function verifyAndGetUrl(code, password) {
  const collection = await getCollection();

  const doc = await collection.findOne(
    { code },
    { projection: { originalUrl: 1, expiresAt: 1, password: 1 } }
  );

  if (!doc) return { url: null, error: 'Link not found' };

  // Check expiry
  if (doc.expiresAt && new Date(doc.expiresAt) < new Date()) {
    return { url: null, error: 'This link has expired' };
  }

  // Check password
  if (doc.password !== password) {
    return { url: null, error: 'Incorrect password' };
  }

  // Increment clicks
  await collection.updateOne(
    { code },
    { $inc: { clicks: 1 }, $set: { lastClickedAt: new Date() } }
  );

  return { url: doc.originalUrl };
}

/**
 * Get URL stats by code
 */
export async function getUrlStats(code) {
  const collection = await getCollection();
  return collection.findOne(
    { code },
    { projection: { _id: 0, code: 1, originalUrl: 1, clicks: 1, createdAt: 1, lastClickedAt: 1, expiresAt: 1, password: 1 } }
  );
}

/**
 * Get all URLs for dashboard with pagination and search
 * @param {Object} options
 * @param {number} options.page - Page number (1-indexed)
 * @param {number} options.limit - Items per page
 * @param {string} options.search - Search query
 * @returns {Object} { urls, total, page, totalPages }
 */
export async function getAllUrls({ page = 1, limit = 20, search = '' } = {}) {
  const collection = await getCollection();

  const filter = search
    ? {
        $or: [
          { code: { $regex: search, $options: 'i' } },
          { originalUrl: { $regex: search, $options: 'i' } },
        ],
      }
    : {};

  const total = await collection.countDocuments(filter);
  const urls = await collection
    .find(filter, { projection: { _id: 0 } })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .toArray();

  return {
    urls,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get dashboard aggregate stats
 */
export async function getDashboardStats() {
  const collection = await getCollection();
  const now = new Date();

  const [totalLinks, totalClicks, activeLinks, expiredLinks] = await Promise.all([
    collection.countDocuments(),
    collection.aggregate([{ $group: { _id: null, total: { $sum: '$clicks' } } }]).toArray(),
    collection.countDocuments({
      $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
    }),
    collection.countDocuments({
      expiresAt: { $ne: null, $lte: now },
    }),
  ]);

  return {
    totalLinks,
    totalClicks: totalClicks[0]?.total || 0,
    activeLinks,
    expiredLinks,
  };
}

/**
 * Delete a URL by code
 */
export async function deleteUrl(code) {
  const collection = await getCollection();
  const result = await collection.deleteOne({ code });
  return result.deletedCount > 0;
}

/**
 * Update a URL
 * @param {string} code - The short code
 * @param {Object} updates - Fields to update
 */
export async function updateUrl(code, updates) {
  const collection = await getCollection();
  const allowedFields = ['originalUrl', 'expiresAt', 'password'];
  const updateDoc = {};

  for (const field of allowedFields) {
    if (field in updates) {
      if (field === 'expiresAt') {
        updateDoc[field] = updates[field] ? new Date(updates[field]) : null;
      } else if (field === 'password') {
        updateDoc[field] = updates[field] || null;
      } else {
        updateDoc[field] = updates[field];
      }
    }
  }

  if (Object.keys(updateDoc).length === 0) {
    throw new Error('No valid fields to update');
  }

  const result = await collection.updateOne({ code }, { $set: updateDoc });
  return result.modifiedCount > 0;
}
