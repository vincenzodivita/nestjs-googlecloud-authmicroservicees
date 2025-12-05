import { Controller, Post, Delete, Body, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

class RegisterDeviceDto {
  @IsString()
  @IsNotEmpty()
  fcmToken: string;

  @IsOptional()
  @IsString()
  deviceInfo?: string;

  @IsOptional()
  @IsEnum(['web', 'android', 'ios'])
  platform?: 'web' | 'android' | 'ios';
}

class UnregisterDeviceDto {
  @IsString()
  @IsNotEmpty()
  fcmToken: string;
}

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('register-device')
  async registerDevice(@Request() req, @Body() dto: RegisterDeviceDto) {
    const device = await this.notificationsService.registerDevice(
      req.user.id,
      dto.fcmToken,
      dto.deviceInfo,
      dto.platform,
    );
    return {
      message: 'Device registered successfully',
      device: {
        id: device.id,
        platform: device.platform,
      },
    };
  }

  @Delete('unregister-device')
  @HttpCode(HttpStatus.OK)
  async unregisterDevice(@Body() dto: UnregisterDeviceDto) {
    await this.notificationsService.unregisterDevice(dto.fcmToken);
    return { message: 'Device unregistered successfully' };
  }
}