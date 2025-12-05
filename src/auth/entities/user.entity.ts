export interface User {
  id?: string;
  email: string;
  password: string;
  name: string;
  
  // Verifica email
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  
  // Reset password
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  isEmailVerified: boolean;
  createdAt: Date;
}

// Token per reset password o verifica email
export interface TokenDocument {
  id?: string;
  userId: string;
  token: string;
  type: 'email_verification' | 'password_reset';
  expiresAt: Date;
  createdAt: Date;
  used: boolean;
}