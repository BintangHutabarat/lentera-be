import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { PresignDto } from './dto/presign.dto';

const ALLOWED: Record<string, { maxBytes: number; mimes: string[] }> = {
  assignment_submission: {
    maxBytes: 10 * 1024 * 1024,
    mimes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'],
  },
  avatar: {
    maxBytes: 2 * 1024 * 1024,
    mimes: ['image/jpeg', 'image/png', 'image/webp'],
  },
};

const PRESIGN_EXPIRES = 15 * 60; // 15 menit

@Injectable()
export class UploadsService {
  private client: Minio.Client;
  private bucket: string;
  private publicUrl: string;

  constructor(private configService: ConfigService) {
    this.bucket = this.configService.getOrThrow<string>('MINIO_BUCKET');
    this.publicUrl = this.configService.getOrThrow<string>('MINIO_PUBLIC_URL');

    this.client = new Minio.Client({
      endPoint: this.configService.getOrThrow<string>('MINIO_ENDPOINT'),
      port: Number(this.configService.getOrThrow<string>('MINIO_PORT')),
      useSSL: this.configService.get<string>('MINIO_USE_SSL') === 'true',
      accessKey: this.configService.getOrThrow<string>('MINIO_ACCESS_KEY'),
      secretKey: this.configService.getOrThrow<string>('MINIO_SECRET_KEY'),
    });
  }

  async presign(userId: string, dto: PresignDto) {
    const rule = ALLOWED[dto.purpose];
    if (!rule) throw new BadRequestException({ code: 'INVALID_PURPOSE', message: 'Purpose tidak valid' });
    if (dto.sizeBytes > rule.maxBytes) throw new BadRequestException({ code: 'FILE_TOO_LARGE', message: `Ukuran maks ${rule.maxBytes / 1024 / 1024}MB` });
    if (!rule.mimes.includes(dto.mimeType)) throw new BadRequestException({ code: 'INVALID_FILE_TYPE', message: 'Tipe file tidak didukung' });

    const ext = dto.filename.split('.').pop();
    const now = new Date();
    const fileKey = `${dto.purpose}/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${userId}/${Date.now()}.${ext}`;

    try {
      const uploadUrl = await this.client.presignedPutObject(this.bucket, fileKey, PRESIGN_EXPIRES);
      const fileUrl = `${this.publicUrl}/${this.bucket}/${fileKey}`;

      return {
        uploadUrl,
        fileKey,
        fileUrl,
        expiresInSeconds: PRESIGN_EXPIRES,
      };
    } catch {
      throw new InternalServerErrorException({ code: 'STORAGE_ERROR', message: 'Gagal membuat upload URL' });
    }
  }
}
