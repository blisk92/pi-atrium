/**
 * File tree (Wave 6 / Task 6.1).
 * Reads the directory tree of an agent's runtime dir (or any path).
 * Cap depth and total entries to keep the UI responsive.
 */

import fs from 'node:fs/promises'
import path from 'node:path'

export interface FileNode {
  name: string
  kind: 'file' | 'dir'
  children?: FileNode[]
  size?: number
  modifiedAt?: number
}

const MAX_DEPTH = 6
const MAX_ENTRIES_PER_DIR = 200
const SKIP_NAMES = new Set(['.git', '.DS_Store', 'node_modules', '.cache', '__pycache__'])

export async function readTree(rootPath: string, depth = MAX_DEPTH): Promise<FileNode[]> {
  async function walk(p: string, d: number): Promise<FileNode[]> {
    if (d <= 0) return []
    let entries
    try {
      entries = await fs.readdir(p, { withFileTypes: true })
    } catch {
      return []
    }
    if (entries.length > MAX_ENTRIES_PER_DIR) {
      entries = entries.slice(0, MAX_ENTRIES_PER_DIR)
    }
    const out: FileNode[] = []
    for (const e of entries) {
      if (SKIP_NAMES.has(e.name)) continue
      const full = path.join(p, e.name)
      if (e.isDirectory()) {
        const children = await walk(full, d - 1)
        out.push({ name: e.name, kind: 'dir', children })
      } else if (e.isFile()) {
        try {
          const stat = await fs.stat(full)
          out.push({ name: e.name, kind: 'file', size: stat.size, modifiedAt: stat.mtimeMs })
        } catch {
          out.push({ name: e.name, kind: 'file' })
        }
      }
    }
    // dirs first, then files, both alpha
    out.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'dir' ? -1 : 1
      return a.name.localeCompare(b.name)
    })
    return out
  }
  return walk(rootPath, depth)
}
