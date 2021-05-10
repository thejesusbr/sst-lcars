const path = require('path')
const { sign } = require('crypto')
const { app, Menu } = require('electron')
const MainWindow = require('./MainWindow')


process.env.NODE_ENV = 'development'

const isDev = process.env.NODE_ENV !== 'production' ? true : false
const isMac = process.platform === 'darwin' ? true : false

let mainWindow

const menu = [
  ...(isMac ? [{ role: 'appMenu' }] : []),
  {
    role: 'fileMenu',
  },
  {
    label: 'View',
    submenu: [
      { role: 'togglefullscreen' }
    ]
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
  mainWindow = new MainWindow(
    path.join(__dirname, 'src', 'index.html'),
    path.join(__dirname, 'src', 'assets', 'icons', 'mac', 'icon.icns'),
    isDev)
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

app.allowRendererProcessReuse = true