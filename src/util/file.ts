import fs from 'node:fs';
import path from 'node:path';

export async function readFile(absOrRelPath: string): Promise<string> {
    const readPath = absOrRelPath.startsWith('/') ? absOrRelPath : path.resolve(process.cwd(), absOrRelPath);
    return fs.promises.readFile(readPath, 'utf8');
}

export async function readJson<T extends Record<string, any>>(absOrRelPath: string): Promise<T> {
    const json = await readFile(absOrRelPath);
    return JSON.parse(json) as T;
}

export async function saveFile(absOrRelPath: string, content: string): Promise<string> {
    const writePath = absOrRelPath.startsWith('/') ? absOrRelPath : path.resolve(process.cwd(), absOrRelPath);
    fs.promises.mkdir(path.dirname(writePath), { recursive: true });
    fs.promises.writeFile(writePath, content, 'utf8');
    return writePath;
}