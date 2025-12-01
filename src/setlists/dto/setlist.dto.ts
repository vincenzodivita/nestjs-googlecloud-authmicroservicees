import { IsString, IsNotEmpty, IsArray, IsOptional } from 'class-validator';

export class CreateSetlistDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sharedWith?: string[];  // Array di user IDs
}

export class UpdateSetlistDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  songs?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sharedWith?: string[];  // Array di user IDs
}

export class AddSongToSetlistDto {
  @IsString()
  @IsNotEmpty()
  songId: string;
}

export class ReorderSongsDto {
  @IsArray()
  @IsString({ each: true })
  songIds: string[];
}

export class ShareSetlistDto {
  @IsArray()
  @IsString({ each: true })
  userIds: string[];  // Array di user IDs con cui condividere
}