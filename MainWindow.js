const { BrowserWindow } = require('electron')

class MainWindow extends BrowserWindow {
  constructor(file, icon, isDev) {
    super({
      title: 'Super Star Trek - LCARS edition',
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        icon: icon,
        //devTools: false,
        /*preload: path.join(__dirname, 'preload.js')*/
      }
    })
    this.loadFile(file)
    this.maximize()
    if (isDev) {
      this.webContents.openDevTools()
    }
  }
}

module.exports = MainWindow