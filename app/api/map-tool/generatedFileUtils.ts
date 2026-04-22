import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';

export function getGeneratedMapDataPath(fileName: string): string {
  return path.join(process.cwd(), 'app', 'data', 'map', 'generated', fileName);
}

export async function readGeneratedMapData<T>(fileName: string): Promise<T | undefined> {
  try {
    const source = await readFile(getGeneratedMapDataPath(fileName), 'utf-8');
    return JSON.parse(source) as T;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return undefined;
    }

    throw error;
  }
}

export async function writeGeneratedMapData(fileName: string, data: unknown): Promise<void> {
  const filePath = getGeneratedMapDataPath(fileName);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf-8');
}
