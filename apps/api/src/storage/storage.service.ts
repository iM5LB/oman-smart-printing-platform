import { Injectable } from '@nestjs/common';
import { createHmac, randomUUID } from 'crypto';
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

  createSignedToken(fileKey: string, ttlSeconds?: number): string {
    const ttl = ttlSeconds ?? this.signedUrlTtl;
    const expiresAt = Date.now() + ttl * 1000;
    const payload = `${fileKey}:${expiresAt}`;
    const sig = createHmac('sha256', this.secret).update(payload).digest('hex');
    return Buffer.from(`${payload}:${sig}`).toString('base64url');
  }

  verifySignedToken(token: string): string | null {
    try {
      const decoded = Buffer.from(token, 'base64url').toString('utf8');
      const lastColon = decoded.lastIndexOf(':');
      if (lastColon === -1) return null;
      const sig = decoded.slice(lastColon + 1);
      const payload = decoded.slice(0, lastColon);
      const expected = createHmac('sha256', this.secret).update(payload).digest('hex');
      if (sig !== expected) return null;
      const [fileKey, expiresAtStr] = payload.split(':');
      if (!fileKey || !expiresAtStr) return null;
      if (Date.now() > parseInt(expiresAtStr, 10)) return null;
      return fileKey;
    } catch {
      return null;
    }
  }

  getSignedUrl(fileKey: string, apiBaseUrl: string): string {
    const token = this.createSignedToken(fileKey);
    return `${apiBaseUrl}/api/v1/files/download?token=${token}`;
  }
}
