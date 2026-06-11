/**
 * Text-to-speech (TTS) for the agent's responses (Wave 5 / Task 5.1).
 *
 * Uses the local `mmx` CLI. Writes the synthesized audio to a temp file
 * and returns the path. The renderer plays the file via `<audio>` / `new Audio()`.
 *
 * Optional voice is selectable; defaults to the configured mmx voice.
 */

import { app } from 'electron'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs/promises'

const execFileP = promisify(execFile)

const MMX_PATHS = [
  'C:\\Users\\edmon\\npm-global\\mmx.cmd',
  'C:\\Users\\edmon\\npm-global\\mmx',
  'C:\\Users\\edmon\\AppData\\Roaming\\npm\\mmx.cmd',
  'C:\\Users\\edmon\\AppData\\Roaming\\npm\\mmx',
  'mmx', // fallback to PATH
]

async function findMmx(): Promise<string> {
  for (const p of MMX_PATHS) {
    if (p === 'mmx') return p
    try {
      await fs.access(p)
      return p
    } catch {
      /* try next */
    }
  }
  return 'mmx'
}

let _mmxCmd: string | null = null

export async function synthesizeSpeech(text: string, voice?: string): Promise<{ audioPath: string } | { error: string }> {
  if (!text || !text.trim()) return { error: 'empty text' }
  if (!_mmxCmd) _mmxCmd = await findMmx()

  const tmpDir = app.isPackaged ? os.tmpdir() : path.join(app.getAppPath(), '.runtime', 'tts')
  await fs.mkdir(tmpDir, { recursive: true })
  const audioPath = path.join(tmpDir, `tts-${Date.now()}.mp3`)

  const args = ['speech', 'synthesize', '--text', text, '--out', audioPath]
  if (voice) args.push('--voice', voice)

  try {
    // On Windows, .cmd files need shell: true (or to be invoked via cmd.exe)
    await execFileP(_mmxCmd, args, { timeout: 60_000, shell: true })
    return { audioPath }
  } catch (err) {
    const msg = (err as Error).message
    console.error('[tts] mmx failed:', msg)
    return { error: msg }
  }
}

export async function transcribeAudio(audioPath: string): Promise<{ text: string } | { error: string }> {
  if (!_mmxCmd) _mmxCmd = await findMmx()
  try {
    const { stdout } = await execFileP(
      _mmxCmd,
      ['speech', 'transcribe', audioPath],
      { timeout: 60_000, shell: true }
    )
    return { text: stdout.trim() }
  } catch (err) {
    return { error: (err as Error).message }
  }
}
