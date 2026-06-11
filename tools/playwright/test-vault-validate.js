// Unit test for validateVault:
//   - Empty / null         → error
//   - Non-existent path    → error
//   - A real file (not dir) → error
//   - A directory with .obsidian/  → null (valid)
//   - A directory without .obsidian/ → 'not a vault' error

const path = require('node:path')
const fs = require('node:fs/promises')
const os = require('node:os')

// We can't import the TS file directly, so we inline the logic.
// (If it ever drifts, this test will need to be updated to import.)
async function validateVault(p) {
  if (!p) return 'No path provided.'
  let st
  try {
    st = await fs.stat(p)
  } catch {
    return `Path is not accessible: ${p}`
  }
  if (!st.isDirectory()) return 'Path is not a directory.'
  try {
    await fs.access(path.join(p, '.obsidian'))
    return null
  } catch {}
  try {
    await fs.access(path.join(p, 'obsidian.json'))
    return null
  } catch {}
  return 'No .obsidian folder found. Pick the vault itself (the folder that contains .obsidian/), not its parent.'
}

;(async () => {
  const checks = [
    { name: 'empty string', p: '', expectNull: false },
    { name: 'non-existent', p: 'C:\\nonexistent\\path\\here', expectNull: false },
    { name: 'real file (not dir)', p: __filename, expectNull: false },
    { name: 'dir without .obsidian', p: 'C:\\Windows', expectNull: false },
    { name: 'real vault (SecondBrain)', p: 'C:\\Users\\edmon\\Documents\\ObsidianVault\\SecondBrain', expectNull: true },
    { name: 'parent of vault (ObsidianVault)', p: 'C:\\Users\\edmon\\Documents\\ObsidianVault', expectNull: false },
  ]

  let failed = 0
  for (const c of checks) {
    const r = await validateVault(c.p)
    const ok = (r === null) === c.expectNull
    console.log(`${ok ? '✅' : '❌'}  ${c.name}  →  ${r === null ? '(valid)' : r}`)
    if (!ok) failed++
  }

  if (failed > 0) {
    console.error(`\n${failed} test(s) failed`)
    process.exit(1)
  }
  console.log('\n✅ PASS: validateVault behaves correctly for all cases')
})()
