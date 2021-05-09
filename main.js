const path = require('path')
const { sign } = require('crypto')
const { app, BrowserWindow, Menu } = require('electron')


process.env.NODE_ENV = 'development'

const isDev = process.env.NODE_ENV !== 'production' ? true : false
const isMac = process.platform === 'darwin' ? true : false

let win

const menu = [
  ...(isMac ? [{ role: 'appMenu' }] : []),
  {
    role: 'fileMenu',
  },
  ...(isDev
    ? [
        {
          label: 'Developer',
          submenu: [
            { role: 'reload' },
            { role: 'forcereload' },
            { type: 'separator' },
            { role: 'toggledevtools' },
          ],
        },
      ]
    : []),
]

function createWindow () {
  win = new BrowserWindow({
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      //devTools: false,
      /*preload: path.join(__dirname, 'preload.js')*/
    }
  })
  win.loadFile(path.join(__dirname, 'src', 'index.html'))
  win.maximize()
  if (isDev) {
    win.webContents.openDevTools()
  }
}

app.whenReady().then(() => {
  const mainMenu = Menu.buildFromTemplate(menu)
  Menu.setApplicationMenu(mainMenu)

  createWindow()
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (isMac) {
    app.quit()
  }
})