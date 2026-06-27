import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const options = {
  maxPoolSize: 10,
  minPoolSize: 2,
  maxIdleTimeMS: 30000,
  connectTimeoutMS: 5000,
  socketTimeoutMS: 5000,
};

let client;
let clientPromise;

function getClientPromise() {
  if (!uri) {
    throw new Error('Please define the MONGODB_URI environment variable');
  }

  if (process.env.NODE_ENV === 'development') {
    // In development, use a global variable so the connection
    // is preserved across hot-reloads
    if (!global._mongoClientPromise) {
      client = new MongoClient(uri, options);
      global._mongoClientPromise = client.connect();
    }
    clientPromise = global._mongoClientPromise;
  } else {
    // In production, reuse the same promise
    if (!clientPromise) {
      client = new MongoClient(uri, options);
      clientPromise = client.connect();
    }
  }

  return clientPromise;
}

export default getClientPromise;
