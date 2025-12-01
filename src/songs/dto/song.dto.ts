import { IsString, IsNotEmpty, IsNumber, Min, Max, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

class SongSectionDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @Min(1)
  @Max(999)
  bars: number;
}

export class CreateSongDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @Min(30)
  @Max(300)
  bpm: number;

  @IsNumber()
  @Min(2)
  @Max(12)
  timeSignature: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SongSectionDto)
  sections?: SongSectionDto[];
}

export class UpdateSongDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsNumber()
  @Min(30)
  @Max(300)
  bpm?: number;

  @IsOptional()
  @IsNumber()
  @Min(2)
  @Max(12)
  timeSignature?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SongSectionDto)
  sections?: SongSectionDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sharedWith?: string[];
}

export class ShareSongDto {
  @IsArray()
  @IsString({ each: true })
  userIds: string[];
}

