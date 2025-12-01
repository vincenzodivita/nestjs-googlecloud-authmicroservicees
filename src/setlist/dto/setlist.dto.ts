import { IsString, IsNotEmpty, IsArray, IsOptional } from 'class-validator';

export class CreateSetlistDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
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
