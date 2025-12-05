import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { FirestoreService } from '../firestore/firestore.service';
import { EmailService } from '../email/email.service';
import {
  RegisterDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyEmailDto,
  ChangePasswordDto,
  ResendVerificationDto,
} from './dto/auth.dto';
import { User, UserResponse, TokenDocument } from './entities/user.entity';

@Injectable()
export class AuthService {
  private readonly USERS_COLLECTION = 'users';
  private readonly TOKENS_COLLECTION = 'auth_tokens';

  constructor(
    private firestoreService: FirestoreService,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  // === REGISTRAZIONE ===
  async register(registerDto: RegisterDto): Promise<{ user: UserResponse; access_token: string | null; message: string }> {
    const { email, password, name } = registerDto;

    // Verifica se l'email esiste già
    const existingUsers = await this.firestoreService.queryDocuments(
      this.USERS_COLLECTION,
      'email',
      '==',
      email.toLowerCase(),
    );

    if (existingUsers.length > 0) {
      throw new ConflictException('Email già registrata');
    }

    // Hash della password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Genera token di verifica email
    const verificationToken = this.generateToken();
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 ore

    const now = new Date();
    const userData: Omit<User, 'id'> = {
      email: email.toLowerCase(),
      password: hashedPassword,
      name,
      isEmailVerified: false,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires,
      createdAt: now,
      updatedAt: now,
    };

    const createdUser = await this.firestoreService.createDocument(
      this.USERS_COLLECTION,
      userData,
    );

    // Salva il token nel database
    await this.saveToken(createdUser.id, verificationToken, 'email_verification', verificationExpires);

    // Invia solo email di verifica (welcome email verrà inviata dopo la verifica)
    await this.emailService.sendVerificationEmail(email, name, verificationToken);

    // NON generiamo JWT - l'utente deve prima verificare l'email
    return {
      user: this.toUserResponse(createdUser as User),
      access_token: null, // Nessun token fino a verifica email
      message: 'Registrazione completata. Controlla la tua email per verificare l\'account.',
    };
  }

  // === LOGIN ===
  async login(loginDto: LoginDto): Promise<{ user: UserResponse; access_token: string }> {
    const { email, password } = loginDto;

    const users = await this.firestoreService.queryDocuments(
      this.USERS_COLLECTION,
      'email',
      '==',
      email.toLowerCase(),
    );

    if (users.length === 0) {
      throw new UnauthorizedException('Credenziali non valide');
    }

    const user = users[0] as User;

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenziali non valide');
    }

    // Blocca login se email non verificata
    if (!user.isEmailVerified) {
      throw new UnauthorizedException('Email non verificata. Controlla la tua casella di posta per il link di verifica.');
    }

    const payload = { sub: user.id, email: user.email };
    const access_token = await this.jwtService.signAsync(payload);

    return {
      user: this.toUserResponse(user),
      access_token,
    };
  }

  // === VERIFICA EMAIL ===
  async verifyEmail(dto: VerifyEmailDto): Promise<{ message: string; user: UserResponse; access_token: string }> {
    const { token } = dto;

    // Cerca il token nel database
    const tokenDoc = await this.findValidToken(token, 'email_verification');
    if (!tokenDoc) {
      throw new BadRequestException('Token di verifica non valido o scaduto');
    }

    // Ottieni l'utente
    const user = await this.firestoreService.getDocument(
      this.USERS_COLLECTION,
      tokenDoc.userId,
    ) as User;

    if (!user) {
      throw new NotFoundException('Utente non trovato');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email già verificata');
    }

    // Aggiorna l'utente
    await this.firestoreService.updateDocument(this.USERS_COLLECTION, user.id!, {
      isEmailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpires: null,
      updatedAt: new Date(),
    });

    // Invalida il token
    await this.invalidateToken(tokenDoc.id!);

    // Invia email di benvenuto dopo la verifica
    await this.emailService.sendWelcomeEmail(user.email, user.name);

    // Genera JWT per permettere login automatico dopo verifica
    const payload = { sub: user.id, email: user.email };
    const access_token = await this.jwtService.signAsync(payload);

    return {
      message: 'Email verificata con successo',
      user: this.toUserResponse({ ...user, isEmailVerified: true }),
      access_token,
    };
  }

  // === REINVIA EMAIL DI VERIFICA ===
  async resendVerificationEmail(dto: ResendVerificationDto): Promise<{ message: string }> {
    const { email } = dto;

    const users = await this.firestoreService.queryDocuments(
      this.USERS_COLLECTION,
      'email',
      '==',
      email.toLowerCase(),
    );

    if (users.length === 0) {
      // Non rivelare se l'email esiste o meno
      return { message: 'Se l\'email esiste, riceverai un link di verifica' };
    }

    const user = users[0] as User;

    if (user.isEmailVerified) {
      throw new BadRequestException('Email già verificata');
    }

    // Genera nuovo token
    const verificationToken = this.generateToken();
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Invalida vecchi token di verifica
    await this.invalidateUserTokens(user.id!, 'email_verification');

    // Salva nuovo token
    await this.saveToken(user.id!, verificationToken, 'email_verification', verificationExpires);

    // Aggiorna utente
    await this.firestoreService.updateDocument(this.USERS_COLLECTION, user.id!, {
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires,
      updatedAt: new Date(),
    });

    // Invia email
    await this.emailService.sendVerificationEmail(user.email, user.name, verificationToken);

    return { message: 'Email di verifica inviata' };
  }

  // === FORGOT PASSWORD ===
  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const { email } = dto;

    const users = await this.firestoreService.queryDocuments(
      this.USERS_COLLECTION,
      'email',
      '==',
      email.toLowerCase(),
    );

    // Non rivelare se l'email esiste (sicurezza)
    if (users.length === 0) {
      return { message: 'Se l\'email esiste, riceverai un link per reimpostare la password' };
    }

    const user = users[0] as User;

    // Genera token di reset
    const resetToken = this.generateToken();
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 ora

    // Invalida vecchi token di reset
    await this.invalidateUserTokens(user.id!, 'password_reset');

    // Salva nuovo token
    await this.saveToken(user.id!, resetToken, 'password_reset', resetExpires);

    // Aggiorna utente
    await this.firestoreService.updateDocument(this.USERS_COLLECTION, user.id!, {
      passwordResetToken: resetToken,
      passwordResetExpires: resetExpires,
      updatedAt: new Date(),
    });

    // Invia email
    await this.emailService.sendPasswordResetEmail(user.email, user.name, resetToken);

    return { message: 'Se l\'email esiste, riceverai un link per reimpostare la password' };
  }

  // === RESET PASSWORD ===
  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const { token, newPassword } = dto;

    // Cerca il token nel database
    const tokenDoc = await this.findValidToken(token, 'password_reset');
    if (!tokenDoc) {
      throw new BadRequestException('Token di reset non valido o scaduto');
    }

    // Ottieni l'utente
    const user = await this.firestoreService.getDocument(
      this.USERS_COLLECTION,
      tokenDoc.userId,
    ) as User;

    if (!user) {
      throw new NotFoundException('Utente non trovato');
    }

    // Hash della nuova password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Aggiorna l'utente
    await this.firestoreService.updateDocument(this.USERS_COLLECTION, user.id!, {
      password: hashedPassword,
      passwordResetToken: null,
      passwordResetExpires: null,
      updatedAt: new Date(),
    });

    // Invalida il token
    await this.invalidateToken(tokenDoc.id!);

    // Invalida tutti gli altri token di reset per questo utente
    await this.invalidateUserTokens(user.id!, 'password_reset');

    // Invia email di conferma
    await this.emailService.sendPasswordChangedEmail(user.email, user.name);

    return { message: 'Password reimpostata con successo' };
  }

  // === CHANGE PASSWORD (utente autenticato) ===
  async changePassword(userId: string, dto: ChangePasswordDto): Promise<{ message: string }> {
    const { currentPassword, newPassword } = dto;

    const user = await this.firestoreService.getDocument(
      this.USERS_COLLECTION,
      userId,
    ) as User;

    if (!user) {
      throw new NotFoundException('Utente non trovato');
    }

    // Verifica password attuale
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Password attuale non corretta');
    }

    // Hash della nuova password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Aggiorna
    await this.firestoreService.updateDocument(this.USERS_COLLECTION, userId, {
      password: hashedPassword,
      updatedAt: new Date(),
    });

    // Invia email di conferma
    await this.emailService.sendPasswordChangedEmail(user.email, user.name);

    return { message: 'Password modificata con successo' };
  }

  // === VALIDATE USER (per JWT Strategy) ===
  async validateUser(userId: string): Promise<UserResponse> {
    const user = await this.firestoreService.getDocument(
      this.USERS_COLLECTION,
      userId,
    ) as User;

    if (!user) {
      throw new UnauthorizedException('Utente non trovato');
    }

    return this.toUserResponse(user);
  }

  // === CHECK EMAIL EXISTS ===
  async checkEmailExists(email: string): Promise<{ exists: boolean }> {
    const users = await this.firestoreService.queryDocuments(
      this.USERS_COLLECTION,
      'email',
      '==',
      email.toLowerCase(),
    );

    return { exists: users.length > 0 };
  }

  // === HELPER METHODS ===

  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private async saveToken(
    userId: string,
    token: string,
    type: 'email_verification' | 'password_reset',
    expiresAt: Date,
  ): Promise<void> {
    const tokenDoc: Omit<TokenDocument, 'id'> = {
      userId,
      token,
      type,
      expiresAt,
      createdAt: new Date(),
      used: false,
    };

    await this.firestoreService.createDocument(this.TOKENS_COLLECTION, tokenDoc);
  }

  private async findValidToken(
    token: string,
    type: 'email_verification' | 'password_reset',
  ): Promise<TokenDocument | null> {
    const tokens = await this.firestoreService.queryDocuments<TokenDocument>(
      this.TOKENS_COLLECTION,
      'token',
      '==',
      token,
    );

    const validToken = tokens.find(
      (t) =>
        t.type === type &&
        !t.used &&
        new Date(t.expiresAt) > new Date(),
    );

    return validToken || null;
  }

  private async invalidateToken(tokenId: string): Promise<void> {
    await this.firestoreService.updateDocument(this.TOKENS_COLLECTION, tokenId, {
      used: true,
    });
  }

  private async invalidateUserTokens(userId: string, type: 'email_verification' | 'password_reset'): Promise<void> {
    const tokens = await this.firestoreService.queryDocuments<TokenDocument>(
      this.TOKENS_COLLECTION,
      'userId',
      '==',
      userId,
    );

    const tokensToInvalidate = tokens.filter((t) => t.type === type && !t.used);

    for (const token of tokensToInvalidate) {
      await this.invalidateToken(token.id!);
    }
  }

  private toUserResponse(user: User): UserResponse {
    return {
      id: user.id!,
      email: user.email,
      name: user.name,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt,
    };
  }
}