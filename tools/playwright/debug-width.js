const { _electron: electron } = require('playwright')
const path = require('path')

const appDir = path.resolve(__dirname, '../../app')

;(async () => {
  const app = await electron.launch({
    args: [appDir],
    executablePath: path.join(appDir, 'node_modules', 'electron', 'dist', 'electron.exe'),
  })
  const window = await app.firstWindow(null, { timeout: 30000 })
  await window.waitForFunction(
    () => document.querySelector('.dot-active') !== null,
    null,
    { timeout: 15000 }
  )
  await window.waitForTimeout(1500)

  const widths = await window.evaluate(() => {
    const chatPane = document.querySelector('.chat-pane')
    const middlePane = document.querySelector('.middle-pane')
    const inputArea = document.querySelector('.input-area')
    const inputBox = document.querySelector('.input-box')
    return {
      chatPane: chatPane ? { w: chatPane.offsetWidth, cs: getComputedStyle(chatPane).width } : null,
      middlePane: middlePane ? { w: middlePane.offsetWidth, cs: getComputedStyle(middlePane).width } : null,
      inputArea: inputArea ? { w: inputArea.offsetWidth, cs: getComputedStyle(inputArea).width } : null,
      inputBox: inputBox ? { w: inputBox.offsetWidth, cs: getComputedStyle(inputBox).width } : null,
    }
  })
  console.log(JSON.stringify(widths, null, 2))

  await app.close()
})()
