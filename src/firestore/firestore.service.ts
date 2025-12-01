import { Injectable, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { Firestore } from 'firebase-admin/firestore';

@Injectable()
export class FirestoreService implements OnModuleInit {
  private firestore: Firestore;

  onModuleInit() {
    // Inizializza Firebase Admin SDK
    // Su Cloud Run, le credenziali vengono rilevate automaticamente
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
    }

    this.firestore = admin.firestore();
  }

  getFirestore(): Firestore {
    return this.firestore;
  }

  // --- Operazioni CRUD generiche ---

  async getDocument<T = any>(collection: string, id: string): Promise<T | null> {
    const doc = await this.firestore.collection(collection).doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as T;
  }

  async createDocument<T = any>(collection: string, data: T, docId?: string): Promise<T & { id: string }> {
    if (docId) {
      await this.firestore.collection(collection).doc(docId).set(data);
      return { id: docId, ...data };
    } else {
      const docRef = await this.firestore.collection(collection).add(data);
      return { id: docRef.id, ...data };
    }
  }

  async updateDocument<T = any>(collection: string, docId: string, data: Partial<T>): Promise<T & { id: string }> {
    await this.firestore.collection(collection).doc(docId).update(data);
    return { id: docId, ...data } as T & { id: string };
  }

  async deleteDocument(collection: string, docId: string): Promise<void> {
    await this.firestore.collection(collection).doc(docId).delete();
  }

  // --- Query con tipi corretti ---
  async queryDocuments<T = any>(
    collection: string,
    field: string,
    operator: admin.firestore.WhereFilterOp, // <-- tipo corretto
    value: any
  ): Promise<(T & { id: string })[]> {
    const snapshot = await this.firestore
      .collection(collection)
      .where(field, operator, value)
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as (T & { id: string })[];
  }
}
