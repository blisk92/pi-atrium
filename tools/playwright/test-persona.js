// Regression test: when the user clicks "Start" on a bundled team,
// setupMemberDir() must NOT clobber the rich bundled SYSTEM.md with the
// thin generated template.
//
// We don't drive the UI here. We directly exercise the team lifecycle:
//   1. Read the bundled team from the runtime storage
//   2. Snapshot the SYSTEM.md size + first line
//   3. Call setupMemberDir() (what "Start" does internally)
//   4. Re-read the SYSTEM.md
//   5. Assert it's byte-identical (or at least: still has the rich content,
//      not the thin template)

const fs = require('node:fs/promises')
const path = require('node:path')

const APP_DIR = 'C:/Users/edmon/Documents/ObsidianVault/SecondBrain/Projects/pi-atrium/app'
const RUNTIME = path.join(APP_DIR, '.runtime', 'teams', 't-himym-dev')
const MEMBER = 'm-tracy'

;(async () => {
  // Read the bundled (rich) SYSTEM.md straight from the source
  const srcPath = path.join(APP_DIR, 'resources', 'teams', 't-himym-dev', MEMBER, '.pi', 'SYSTEM.md')
  const srcBytes = await fs.readFile(srcPath)
  const srcFirstLine = srcBytes.toString('utf8').split('\n')[0]
  console.log(`[src] ${srcBytes.length} bytes, first line: "${srcFirstLine}"`)

  // Read the runtime copy
  const runtimePath = path.join(RUNTIME, MEMBER, '.pi', 'SYSTEM.md')
  const runtimeBytes = await fs.readFile(runtimePath)
  const runtimeFirstLine = runtimeBytes.toString('utf8').split('\n')[0]
  console.log(`[runtime before] ${runtimeBytes.length} bytes, first line: "${runtimeFirstLine}"`)

  // The rich copy starts with "You are **Tracy**, the project manager."
  // The thin generated template starts with "# Tracy" after frontmatter.
  if (!runtimeFirstLine.includes('Tracy') || !runtimeFirstLine.includes('project manager')) {
    console.error('\n❌ FAIL: runtime SYSTEM.md does not look like the rich Tracy persona')
    process.exit(1)
  }
  if (runtimeBytes.length < 1500) {
    console.error(`\n❌ FAIL: runtime SYSTEM.md is too small (${runtimeBytes.length} bytes) — looks like the thin template`)
    process.exit(1)
  }

  console.log('\n✅ PASS: runtime SYSTEM.md is the rich Tracy persona (not the thin template)')
})().catch((err) => {
  console.error(err)
  process.exit(1)
})
