import { Injectable } from '@nestjs/common';
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { mkdir, readFile, writeFile, unlink } from 'fs/promises';
import { join } from 'path';

@Injectable()
export class StorageService {
  private readonly baseDir: string;
  private readonly secret: string;
  private readonly signedUrlTtl: number;

  constructor() {
    this.baseDir = process.env.STORAGE_LOCAL_PATH ?? join(process.cwd(), '.data', 'uploads');
    this.secret = process.env.JWT_SECRET ?? 'dev-secret';
    this.signedUrlTtl = parseInt(process.env.SIGNED_URL_TTL_SECONDS ?? '300', 10);
  }

  async ensureDir(): Promise<void> {
    await mkdir(this.baseDir, { recursive: true });
  }

  generateKey(storeId: string, filename: string): string {
    const ext = filename.includes('.') ? filename.slice(filename.lastIndexOf('.')) : '';
    return `${storeId}/${randomUUID()}${ext}`;
  }

  async saveFile(key: string, buffer: Buffer): Promise<void> {
    await this.ensureDir();
    const fullPath = join(this.baseDir, key);
    await mkdir(join(this.baseDir, key.split('/')[0]), { recursive: true });
    await writeFile(fullPath, buffer);
  }

  async readFile(key: string): Promise<Buffer> {
    return readFile(join(this.baseDir, key));
  }

  async deleteFile(key: string): Promise<void> {
    try {
      await unlink(join(this.baseDir, key));
    } catch {
      // file may already be gone
    }
  }

  createSignedToken(fileKey: string, ttlSeconds?: number, filename?: string): string {
    const ttl = ttlSeconds ?? this.signedUrlTtl;
    const expiresAt = Date.now() + ttl * 1000;
    const namePart = filename?.trim()
      ? Buffer.from(filename.trim(), 'utf8').toString('base64url')
      : '';
    const payload = namePart
      ? `${fileKey}:${expiresAt}:${namePart}`
      : `${fileKey}:${expiresAt}`;
    const sig = createHmac('sha256', this.secret).update(payload).digest('hex');
    return Buffer.from(`${payload}:${sig}`).toString('base64url');
  }

  /**
   * Verifies a signed download token.
   * Returns file key, and original filename when the token includes one.
   */
  verifySignedToken(token: string): { fileKey: string; filename: string | null } | null {
    try {
      const decoded = Buffer.from(token, 'base64url').toString('utf8');
      const lastColon = decoded.lastIndexOf(':');
      if (lastColon === -1) return null;
      const sig = decoded.slice(lastColon + 1);
      const payload = decoded.slice(0, lastColon);
      const expected = createHmac('sha256', this.secret).update(payload).digest('hex');
      const a = Buffer.from(sig, 'utf8');
      const b = Buffer.from(expected, 'utf8');
      if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

      const parts = payload.split(':');
      if (parts.length < 2) return null;

      let fileKey: string;
      let expiresAtStr: string;
      let filename: string | null = null;

      if (parts.length >= 3 && /^\d+$/.test(parts[parts.length - 2] ?? '')) {
        // fileKey:expiresAt:filenameB64
        expiresAtStr = parts[parts.length - 2]!;
        const nameB64 = parts[parts.length - 1]!;
        fileKey = parts.slice(0, -2).join(':');
        try {
          const raw = Buffer.from(nameB64, 'base64url').toString('utf8').trim();
          filename = raw || null;
        } catch {
          filename = null;
        }
      } else {
        // Legacy: fileKey:expiresAt
        expiresAtStr = parts[parts.length - 1]!;
        fileKey = parts.slice(0, -1).join(':');
      }

      if (!fileKey || !expiresAtStr) return null;
      if (
        fileKey.includes('..') ||
        fileKey.includes('\\') ||
        fileKey.startsWith('/') ||
        fileKey.includes('\0')
      ) {
        return null;
      }
      if (Date.now() > parseInt(expiresAtStr, 10)) return null;
      return { fileKey, filename };
    } catch {
      return null;
    }
  }

  getSignedUrl(
    fileKey: string,
    apiBaseUrl: string,
    ttlSeconds?: number,
    filename?: string | null,
  ): string {
    const token = this.createSignedToken(fileKey, ttlSeconds, filename ?? undefined);
    return `${apiBaseUrl}/api/v1/files/download?token=${token}`;
  }
}
