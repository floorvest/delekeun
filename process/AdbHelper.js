const adb = require('android-platform-tools')
// const usbDetect = require('usb')
const adbkit = require('adbkit')
const config = require('./Configuration')

class AdbHelper {

    // watchList(ev, onDetect) {
    //     usbDetect.on('attach', (event) => {
    //         onDetect(event)
    //         this.client.listDevices()
    //         .then((re) => {
    //             ev(re);
    //         })
    //     })

    //     usbDetect.on('detach', (event) => {
    //         onDetect(event)
    //         this.client.listDevices()
    //         .then((re) => {
    //             ev(re);
    //         })
    //     })
    // }

    getList() {
        return this.client.listDevices()
    }

    getProp(serial) {
        return this.client.getProperties(serial)
    }

    shell(serial, command) {
        return this.client.shell(serial, command)
                .then(adbkit.util.readAll)
                .then((output) => {
                    console.log(output)
                    return output.toString().trim()
                }) 
    }

    pushFile(serial, path, dir) {
        return this.client.push(serial, path, dir, '0777')
            .then((transfer) => {
                let promise = new Promise((resolve, reject) => {
                    transfer.on('end', resolve)
                    transfer.on('error', reject)
                })

                return promise
            })
    } 

    download() {

        let self = this;
        if (config.getInstance().get('adbPath') == null) {
           
            let promise = new Promise((resolved, reject) => {
                adb.downloadAndReturnToolPaths().then((result) => {
                    self.adbPath = result.adbPath;
                    config.getInstance().set('adbPath', self.adbPath)
                    this.initAdb()

                    resolved(result.adbPath);
                }, reject);
            });

            return promise
        } else {
            self.adbPath = config.getInstance().get('adbPath');
            this.initAdb()
            return Promise.resolve(self.adbPath);
        }

        
    }

    initAdb() {
        this.client = adbkit.createClient({
            bin: this.adbPath
        })
        return this.client;
    }

    getInstance() {
        return this.client;
    }

}

module.exports = new AdbHelper();