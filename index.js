const { 
    app, 
    BrowserWindow,
    ipcMain
} = require('electron')

const config = require('./process/Configuration');

const adbhelper = require('./process/AdbHelper')


let home = null;

/** 
 * Configuration
 */
global.AppInfo = {
    name: "Delekeun",
    version: 'v1.0.0'
}

config.getInstance().set('appName', global.AppInfo.name);

ipcMain.on('deviceRun', (event, device) => {
    let width = 390
    let size = {
        width,
        height: Math.round((device.stream.res.height / device.stream.res.width) * width)
    }

    device.size = size
    createWindow(size.width, size.height + 120, 'view/phone.html', device)
});

function createWindow(width, height, view, args) {
    width += 300

    let win = new BrowserWindow({
        width,
        height,
        webPreferences: {
            nodeIntegration: true
        }
    })

    win.deviceData = args
    win.loadFile(view);
    win.webContents.toggleDevTools()

    return win;
}

function createHome() {
    return createWindow(800, 600, "view/home.html", {});
}

app.on('ready', () => {
    // create home window
    home = createHome();
    
    home.on('close', () => {
        home = null;
    })


})

app.on('window-all-closed', () => {
    if (process.platform != 'darwin') {
        app.quit();
    }
})

app.on('activate', () => {
    if (home == null) {
        home = createHome();
    }
})