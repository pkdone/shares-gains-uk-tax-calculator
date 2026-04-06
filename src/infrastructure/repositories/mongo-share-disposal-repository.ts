import { ObjectId, type WithId } from 'mongodb';

import type {
  CreateShareDisposal,
  PdfImportDisposalInsertRow,
  ShareDisposalRepository,
} from '@/domain/repositories/share-disposal-repository';
import type { ShareDisposal } from '@/domain/schemas/share-disposal';
import { getMongoClient } from '@/infrastructure/persistence/mongodb-client';
import type { DisposalDocument } from '@/infrastructure/persistence/schemas/disposal-record';
import { COLLECTION_DISPOSALS } from '@/infrastructure/persistence/schema-registry';
import { PersistenceError } from '@/shared/errors/app-error';

type DisposalDoc = WithId<DisposalDocument>;

function mapDoc(doc: DisposalDoc): ShareDisposal {
  const base: ShareDisposal = {
    id: doc._id.toHexString(),
    holdingId: doc.holdingId.toHexString(),
    userId: doc.userId,
    symbol: doc.symbol,
    eventDate: doc.eventDate,
    quantity: doc.quantity,
    grossProceedsUsd: doc.grossProceedsUsd,
    feesUsd: doc.feesUsd,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
  if ('importSourceFingerprint' in doc && doc.importSourceFingerprint !== undefined) {
    return { ...base, importSourceFingerprint: doc.importSourceFingerprint };
  }
  return base;
}

export class MongoShareDisposalRepository implements ShareDisposalRepository {
  async insert(input: CreateShareDisposal): Promise<ShareDisposal> {
    if (!ObjectId.isValid(input.holdingId)) {
      throw new PersistenceError('Invalid holding id');
    }

    try {
      const client = await getMongoClient();
      const coll = client.db().collection<DisposalDoc>(COLLECTION_DISPOSALS);
      const _id = new ObjectId();
      const now = new Date();
      const doc: DisposalDoc = {
        _id,
        holdingId: new ObjectId(input.holdingId),
        userId: input.userId,
        symbol: input.symbol,
        eventDate: input.eventDate,
        quantity: input.quantity,
        grossProceedsUsd: input.grossProceedsUsd,
        feesUsd: input.feesUsd,
        createdAt: now,
        updatedAt: now,
        ...(input.importSourceFingerprint === undefined
          ? {}
          : { importSourceFingerprint: input.importSourceFingerprint }),
      };
      await coll.insertOne(doc);
      return mapDoc(doc);
    } catch (err) {
      throw new PersistenceError('Failed to record disposal', { cause: err });
    }
  }

  async insertManyPdfImportBatch(
    holdingId: string,
    userId: string,
    rows: readonly PdfImportDisposalInsertRow[],
  ): Promise<number> {
    if (!ObjectId.isValid(holdingId) || rows.length === 0) {
      return 0;
    }

    try {
      const client = await getMongoClient();
      const coll = client.db().collection<DisposalDoc>(COLLECTION_DISPOSALS);
      const oid = new ObjectId(holdingId);
      const now = new Date();
      const docs: DisposalDoc[] = rows.map((row) => ({
        _id: new ObjectId(),
        holdingId: oid,
        userId,
        symbol: row.symbol,
        eventDate: row.eventDate,
        quantity: row.quantity,
        grossProceedsUsd: row.grossProceedsUsd,
        feesUsd: row.feesUsd,
        importSourceFingerprint: row.importSourceFingerprint,
        createdAt: now,
        updatedAt: now,
      }));
      const res = await coll.insertMany(docs);
      return res.insertedCount;
    } catch (err) {
      throw new PersistenceError('Failed to record disposal import batch', { cause: err });
    }
  }

  async findExistingImportFingerprints(
    holdingId: string,
    userId: string,
    fingerprints: readonly string[],
  ): Promise<ReadonlySet<string>> {
    if (!ObjectId.isValid(holdingId) || fingerprints.length === 0) {
      return new Set();
    }

    try {
      const client = await getMongoClient();
      const coll = client.db().collection<DisposalDoc>(COLLECTION_DISPOSALS);
      const docs = await coll
        .find(
          {
            holdingId: new ObjectId(holdingId),
            userId,
            importSourceFingerprint: { $in: [...fingerprints] },
          },
          { projection: { importSourceFingerprint: 1 } },
        )
        .toArray();
      const out = new Set<string>();
      for (const d of docs) {
        if (d.importSourceFingerprint !== undefined) {
          out.add(d.importSourceFingerprint);
        }
      }
      return out;
    } catch (err) {
      throw new PersistenceError('Failed to query disposal fingerprints', { cause: err });
    }
  }

  async listByHoldingForUser(
    holdingId: string,
    userId: string,
  ): Promise<ShareDisposal[]> {
    if (!ObjectId.isValid(holdingId)) {
      return [];
    }

    try {
      const client = await getMongoClient();
      const coll = client.db().collection<DisposalDoc>(COLLECTION_DISPOSALS);
      const cursor = coll
        .find({
          holdingId: new ObjectId(holdingId),
          userId,
        })
        .sort({ eventDate: 1, _id: 1 });
      const docs = await cursor.toArray();
      return docs.map(mapDoc);
    } catch (err) {
      throw new PersistenceError('Failed to list disposals', { cause: err });
    }
  }

  async deleteByIdForHoldingUser(
    holdingId: string,
    userId: string,
    id: string,
  ): Promise<boolean> {
    if (!ObjectId.isValid(holdingId) || !ObjectId.isValid(id)) {
      return false;
    }

    try {
      const client = await getMongoClient();
      const coll = client.db().collection<DisposalDoc>(COLLECTION_DISPOSALS);
      const res = await coll.deleteOne({
        _id: new ObjectId(id),
        holdingId: new ObjectId(holdingId),
        userId,
      });
      return res.deletedCount === 1;
    } catch (err) {
      throw new PersistenceError('Failed to delete disposal', { cause: err });
    }
  }

  async deleteAllForHoldingUser(holdingId: string, userId: string): Promise<number> {
    if (!ObjectId.isValid(holdingId)) {
      return 0;
    }

    try {
      const client = await getMongoClient();
      const coll = client.db().collection<DisposalDoc>(COLLECTION_DISPOSALS);
      const res = await coll.deleteMany({
        holdingId: new ObjectId(holdingId),
        userId,
      });
      return res.deletedCount;
    } catch (err) {
      throw new PersistenceError('Failed to delete disposals for holding', { cause: err });
    }
  }
}
