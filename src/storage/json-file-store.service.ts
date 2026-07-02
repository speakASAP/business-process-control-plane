import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class JsonFileStoreService {
  private readonly dataDir: string;

  constructor() {
    this.dataDir = process.env.BPCP_DATA_DIR ?? path.join(process.cwd(), 'data');
  }

  readJson<T>(fileName: string, fallback: T): T {
    const filePath = this.resolve(fileName);
    if (!fs.existsSync(filePath)) {
      return fallback;
    }

    const raw = fs.readFileSync(filePath, 'utf8');
    if (raw.trim().length === 0) {
      return fallback;
    }

    return JSON.parse(raw) as T;
  }

  writeJson<T>(fileName: string, value: T): void {
    fs.mkdirSync(this.dataDir, { recursive: true });
    const filePath = this.resolve(fileName);
    const tmpPath = `${filePath}.tmp`;
    fs.writeFileSync(tmpPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    fs.renameSync(tmpPath, filePath);
  }

  getDataDir(): string {
    return this.dataDir;
  }

  private resolve(fileName: string): string {
    return path.join(this.dataDir, fileName);
  }
}
