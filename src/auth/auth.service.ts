import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { FirestoreService } from '../firestore/firestore.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { User, UserResponse } from './entities/user.entity';

@Injectable()
export class AuthService {
  private readonly USERS_COLLECTION = 'users';

  constructor(
    private firestoreService: FirestoreService,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<{ user: UserResponse; access_token: string }> {
    const { email, password, name } = registerDto;

    const existingUsers = await this.firestoreService.queryDocuments(
      this.USERS_COLLECTION,
      'email',
      '==',
      email,
    );

    if (existingUsers.length > 0) {
      throw new ConflictException('Email già registrata');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const now = new Date();
    const userData: Omit<User, 'id'> = {
      email,
      password: hashedPassword,
      name,
      createdAt: now,
      updatedAt: now,
    };

    const createdUser = await this.firestoreService.createDocument(
      this.USERS_COLLECTION,
      userData,
    );

    const payload = { sub: createdUser.id, email: createdUser.email };
    const access_token = await this.jwtService.signAsync(payload);

    const { password: _, ...userResponse } = createdUser;

    return {
      user: userResponse as UserResponse,
      access_token,
    };
  }

  async login(loginDto: LoginDto): Promise<{ user: UserResponse; access_token: string }> {
    const { email, password } = loginDto;

    const users = await this.firestoreService.queryDocuments(
      this.USERS_COLLECTION,
      'email',
      '==',
      email,
    );

    if (users.length === 0) {
      throw new UnauthorizedException('Credenziali non valide');
    }

    const user = users[0] as User;

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenziali non valide');
    }

    const payload = { sub: user.id, email: user.email };
    const access_token = await this.jwtService.signAsync(payload);

    const { password: _, ...userResponse } = user;

    return {
      user: userResponse as UserResponse,
      access_token,
    };
  }

  async validateUser(userId: string): Promise<UserResponse> {
    const user = await this.firestoreService.getDocument(this.USERS_COLLECTION, userId) as User;
    
    if (!user) {
      throw new UnauthorizedException('Utente non trovato');
    }

    const { password, ...userResponse } = user;
    return userResponse as UserResponse;
  }
}
