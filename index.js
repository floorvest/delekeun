const { 
    app, 
    BrowserWindow,
    ipcMain
} = require('electron')

const config = require('./process/Configuration');

const adbhelper = require('./process/AdbHelper')


let home = null

let windows = {}

/** 
 * Configuration
 */
global.AppInfo = {
    name: "Delekeun",
    version: 'v1.0.0'
}

config.getInstance().set('appName', global.AppInfo.name);

ipcMain.on('deviceRun', (event, device) => {
    if (Object.prototype.hasOwnProperty.call(windows, device.device.id)) {
        let w = windows[device.device.id]
        w.webContents.send('refresh', device)
    } else {
        let width = 390
        let size = {
            width,
            height: Math.round((device.stream.res.height / device.stream.res.width) * width)
        }

        device.size = size
        let w = createWindow(size.width, size.height + 120, 'view/phone.html', device)

        windows[device.device.id] = w
    }

    
});

ipcMain.on('deviceDisconnect', (event, serial) => {
    console.log(serial)
    if (Object.prototype.hasOwnProperty.call(windows, serial)) {
        let w = windows[serial]

        w.webContents.send('deviceDisconnect' , serial)
    }
})

function createWindow(width, height, view, args, options) {
    width += 300

    if (options == null) {
        options = {}
    }

    let win = new BrowserWindow({
        width,
        height,
        parent: home,
        resizable: options.resizeable || false,
        maximizable: options.resizable || false,
        webPreferences: {
            nodeIntegration: true
        }
    })

    
    win.deviceData = args
    win.loadFile(view);
    win.webContents.toggleDevTools()

    win.on('close', () => {
      if (args != null) {
        if (Object.prototype.hasOwnProperty.call(windows, args.device.id)) {
            delete windows[args.device.id]
        }
        adbhelper.shell(args.device.id, 'am force-stop jp.co.cyberagent.stf')

      }  
    })

    return win;
}

function createHome() {
    return createWindow(800, 600, "view/home.html");
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