import 'server-only';
import { MongoClient, type Db } from 'mongodb';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || 'vocabmaster';

if (!uri) {
  throw new Error('Missing MONGODB_URI in environment variables.');
}

declare global {
  // eslint-disable-next-line no-var
  var _mongodbClientPromise: Promise<MongoClient> | undefined;
}

let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  if (!global._mongodbClientPromise) {
    const client = new MongoClient(uri);
    global._mongodbClientPromise = client.connect();
  }
  clientPromise = global._mongodbClientPromise;
} else {
  const client = new MongoClient(uri);
  clientPromise = client.connect();
}

export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db(dbName);
}
