import { IsEmail, IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Email non valida' })
  @IsNotEmpty({ message: 'Email obbligatoria' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Password obbligatoria' })
  @MinLength(6, { message: 'La password deve avere almeno 6 caratteri' })
  password: string;

  @IsString()
  @IsNotEmpty({ message: 'Nome obbligatorio' })
  name: string;
}

export class LoginDto {
  @IsEmail({}, { message: 'Email non valida' })
  @IsNotEmpty({ message: 'Email obbligatoria' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Password obbligatoria' })
  password: string;
}

// DTO per richiedere il reset della password
export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Email non valida' })
  @IsNotEmpty({ message: 'Email obbligatoria' })
  email: string;
}

// DTO per completare il reset della password
export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'Token obbligatorio' })
  token: string;

  @IsString()
  @IsNotEmpty({ message: 'Nuova password obbligatoria' })
  @MinLength(6, { message: 'La password deve avere almeno 6 caratteri' })
  newPassword: string;
}

// DTO per verificare l'email
export class VerifyEmailDto {
  @IsString()
  @IsNotEmpty({ message: 'Token obbligatorio' })
  token: string;
}

// DTO per cambiare la password (utente autenticato)
export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'Password attuale obbligatoria' })
  currentPassword: string;

  @IsString()
  @IsNotEmpty({ message: 'Nuova password obbligatoria' })
  @MinLength(6, { message: 'La password deve avere almeno 6 caratteri' })
  newPassword: string;
}

// DTO per reinviare email di verifica
export class ResendVerificationDto {
  @IsEmail({}, { message: 'Email non valida' })
  @IsNotEmpty({ message: 'Email obbligatoria' })
  email: string;
}