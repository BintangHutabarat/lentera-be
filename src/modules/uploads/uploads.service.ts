import { BadRequestException, Injectable, NotImplementedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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

@Injectable()
export class UploadsService {
  constructor(private configService: ConfigService) {}

  async presign(userId: string, dto: PresignDto) {
    const rule = ALLOWED[dto.purpose];
    if (!rule) throw new BadRequestException({ code: 'INVALID_PURPOSE', message: 'Purpose tidak valid' });
    if (dto.sizeBytes > rule.maxBytes) throw new BadRequestException({ code: 'FILE_TOO_LARGE', message: `Ukuran maks ${rule.maxBytes / 1024 / 1024}MB` });
    if (!rule.mimes.includes(dto.mimeType)) throw new BadRequestException({ code: 'INVALID_FILE_TYPE', message: 'Tipe file tidak didukung' });

    const storageUrl = this.configService.get<string>('STORAGE_URL');
    if (!storageUrl) {
      throw new NotImplementedException({ code: 'STORAGE_NOT_CONFIGURED', message: 'Storage belum dikonfigurasi' });
    }

    // Placeholder: generate a file key; actual pre-signed URL requires S3/MinIO SDK
    const ext = dto.filename.split('.').pop();
    const fileKey = `${dto.purpose}/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${userId}/${Date.now()}.${ext}`;

    return {
      uploadUrl: `${storageUrl}/${fileKey}?presigned=1`,
      fileKey,
      expiresInSeconds: 900,
    };
  }
}
