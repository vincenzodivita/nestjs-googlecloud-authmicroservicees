import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { FirestoreService } from '../firestore/firestore.service';

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  click_action?: string;
  data?: Record<string, string>;
}

export interface UserDevice {
  id?: string;
  userId: string;
  fcmToken: string;
  deviceInfo?: string;
  platform?: 'web' | 'android' | 'ios';
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly DEVICES_COLLECTION = 'user_devices';

  constructor(private firestoreService: FirestoreService) {}

  // Registra un device token per un utente
  async registerDevice(
    userId: string,
    fcmToken: string,
    deviceInfo?: string,
    platform?: 'web' | 'android' | 'ios',
  ): Promise<UserDevice> {
    // Verifica se il token esiste già per questo utente
    const existingDevices = await this.firestoreService.queryDocuments<UserDevice>(
      this.DEVICES_COLLECTION,
      'fcmToken',
      '==',
      fcmToken,
    );

    const now = new Date();

    if (existingDevices.length > 0) {
      // Aggiorna il device esistente
      const existingDevice = existingDevices[0];
      await this.firestoreService.updateDocument(
        this.DEVICES_COLLECTION,
        existingDevice.id!,
        {
          userId, // Potrebbe cambiare se l'utente fa logout/login
          deviceInfo,
          platform,
          updatedAt: now,
        },
      );
      this.logger.log(`Updated device token for user ${userId}`);
      return { ...existingDevice, userId, deviceInfo, platform, updatedAt: now };
    }

    // Crea un nuovo device
    const deviceData: Omit<UserDevice, 'id'> = {
      userId,
      fcmToken,
      deviceInfo,
      platform,
      createdAt: now,
      updatedAt: now,
    };

    const createdDevice = await this.firestoreService.createDocument(
      this.DEVICES_COLLECTION,
      deviceData,
    );

    this.logger.log(`Registered new device for user ${userId}`);
    return createdDevice as UserDevice;
  }

  // Rimuovi un device token
  async unregisterDevice(fcmToken: string): Promise<void> {
    const devices = await this.firestoreService.queryDocuments<UserDevice>(
      this.DEVICES_COLLECTION,
      'fcmToken',
      '==',
      fcmToken,
    );

    for (const device of devices) {
      await this.firestoreService.deleteDocument(this.DEVICES_COLLECTION, device.id!);
      this.logger.log(`Unregistered device ${device.id}`);
    }
  }

  // Ottieni tutti i device token di un utente
  async getUserDevices(userId: string): Promise<UserDevice[]> {
    return this.firestoreService.queryDocuments<UserDevice>(
      this.DEVICES_COLLECTION,
      'userId',
      '==',
      userId,
    );
  }

  // Invia notifica push a un singolo utente
  async sendToUser(userId: string, payload: PushNotificationPayload): Promise<boolean> {
    const devices = await this.getUserDevices(userId);

    if (devices.length === 0) {
      this.logger.warn(`No devices found for user ${userId}`);
      return false;
    }

    const tokens = devices.map((d) => d.fcmToken);
    return this.sendToTokens(tokens, payload);
  }

  // Invia notifica push a più utenti
  async sendToUsers(userIds: string[], payload: PushNotificationPayload): Promise<boolean> {
    const allDevices = await Promise.all(
      userIds.map((userId) => this.getUserDevices(userId)),
    );

    const tokens = allDevices.flat().map((d) => d.fcmToken);

    if (tokens.length === 0) {
      this.logger.warn('No devices found for any of the specified users');
      return false;
    }

    return this.sendToTokens(tokens, payload);
  }

  // Invia notifica a token specifici
  async sendToTokens(tokens: string[], payload: PushNotificationPayload): Promise<boolean> {
    if (tokens.length === 0) return false;

    const message: admin.messaging.MulticastMessage = {
      tokens,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      webpush: {
        notification: {
          title: payload.title,
          body: payload.body,
          icon: payload.icon || '/icon-192.png',
          badge: '/icon-192.png',
          requireInteraction: true,
          vibrate: [200, 100, 200],
        },
        fcmOptions: {
          link: payload.click_action || process.env.FRONTEND_URL || 'http://localhost:3000',
        },
      },
      data: payload.data,
    };

    try {
      const response = await admin.messaging().sendEachForMulticast(message);
      
      this.logger.log(
        `Push notification sent: ${response.successCount}/${tokens.length} successful`,
      );

      // Rimuovi i token non validi
      if (response.failureCount > 0) {
        const tokensToRemove: string[] = [];
        response.responses.forEach((res, idx) => {
          if (!res.success) {
            const errorCode = res.error?.code;
            if (
              errorCode === 'messaging/invalid-registration-token' ||
              errorCode === 'messaging/registration-token-not-registered'
            ) {
              tokensToRemove.push(tokens[idx]);
            }
            this.logger.warn(`Failed to send to token ${tokens[idx]}: ${res.error?.message}`);
          }
        });

        // Rimuovi token non validi dal database
        for (const token of tokensToRemove) {
          await this.unregisterDevice(token);
        }
      }

      return response.successCount > 0;
    } catch (error) {
      this.logger.error('Error sending push notification:', error.message);
      return false;
    }
  }

  // === Notifiche specifiche per l'app ===

  // Notifica richiesta di amicizia
  async notifyFriendRequest(recipientUserId: string, senderName: string): Promise<boolean> {
    return this.sendToUser(recipientUserId, {
      title: '👋 Nuova richiesta di amicizia',
      body: `${senderName} ti ha inviato una richiesta di amicizia`,
      icon: '/icon-192.png',
      click_action: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/friends`,
      data: {
        type: 'friend_request',
        senderName,
      },
    });
  }

  // Notifica amicizia accettata
  async notifyFriendAccepted(senderUserId: string, friendName: string): Promise<boolean> {
    return this.sendToUser(senderUserId, {
      title: '🎉 Richiesta accettata!',
      body: `${friendName} ha accettato la tua richiesta di amicizia`,
      icon: '/icon-192.png',
      click_action: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/friends`,
      data: {
        type: 'friend_accepted',
        friendName,
      },
    });
  }

  // Notifica nuovo brano condiviso
  async notifySharedSong(recipientUserId: string, senderName: string, songName: string): Promise<boolean> {
    return this.sendToUser(recipientUserId, {
      title: '🎵 Nuovo brano condiviso',
      body: `${senderName} ha condiviso "${songName}" con te`,
      icon: '/icon-192.png',
      click_action: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/songs`,
      data: {
        type: 'shared_song',
        senderName,
        songName,
      },
    });
  }

  // Notifica nuova setlist condivisa
  async notifySharedSetlist(recipientUserId: string, senderName: string, setlistName: string): Promise<boolean> {
    return this.sendToUser(recipientUserId, {
      title: '📋 Nuova setlist condivisa',
      body: `${senderName} ha condiviso la setlist "${setlistName}" con te`,
      icon: '/icon-192.png',
      click_action: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/setlists`,
      data: {
        type: 'shared_setlist',
        senderName,
        setlistName,
      },
    });
  }
}