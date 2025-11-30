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

  // Helper methods per operazioni comuni
  async getDocument(collection: string, docId: string) {
    const doc = await this.firestore.collection(collection).doc(docId).get();
    if (!doc.exists) {
      return null;
    }
    return { id: doc.id, ...doc.data() };
  }

  async createDocument(collection: string, data: any, docId?: string) {
    if (docId) {
      await this.firestore.collection(collection).doc(docId).set(data);
      return { id: docId, ...data };
    } else {
      const docRef = await this.firestore.collection(collection).add(data);
      return { id: docRef.id, ...data };
    }
  }

  async updateDocument(collection: string, docId: string, data: any) {
    await this.firestore.collection(collection).doc(docId).update(data);
    return { id: docId, ...data };
  }

  async deleteDocument(collection: string, docId: string) {
    await this.firestore.collection(collection).doc(docId).delete();
  }

  async queryDocuments(collection: string, field: string, operator: FirebaseFirestore.WhereFilterOp, value: any) {
    const snapshot = await this.firestore
      .collection(collection)
      .where(field, operator, value)
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
}
