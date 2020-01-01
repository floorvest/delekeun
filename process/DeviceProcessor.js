const adbhelper = require('./AdbHelper')
const path = require('path')
const electron = require('electron')

class DeviceProcessor {

    constructor(serial) {
        this.serial = serial
        this.ready = false
        this.minicapReady = false
        this.minitouchReady = false
        this.readyToUse = false
        
        this.tmpBinaryPath = '/data/local/tmp/delekeun'
    }

    getPath(p) {
        return path.join(electron.app.getAppPath(), p)
    }

    isReady() {
        return this.ready && this.readyToUse
    }

    async loadProp() {
        return adbhelper.getProp(this.serial)
        .then((res) => {
            this.ready = true
            this.prop = res;

            return this;
        })
    }

    getProperties(key) {
        if (this.ready) {
            if (this.prop.hasOwnProperty(key)) {
                return this.prop[key]
            }
        }

        return null;
    }

    /**
     * Check if device already have minicap or minitouch or STFService
     */
    async checkReadines () {
        let ready = {
            minicap: this.minicapReady,
            minitouch: this.minitouchReady
        }

        let files = await adbhelper.getInstance()
            .readdir(this.serial, this.tmpBinaryPath)

        files.forEach((file) => {
            if (file.name == "minicap") {
                ready.minicap = true
            } else if(file.name == 'minitouch') {
                ready.minitouch = true
            }
        })

        return ready
    }

    /**
     * Process Minicap Install
     */
    async installMinicap() {
        let abi = this.getProperties('ro.product.cpu.abi')
        let sdk = this.getProperties('ro.build.version.sdk')
        let pre = this.getProperties('ro.build.version.preview_sdk')
        let rel = this.getProperties('ro.build.version.release')
        let minicapBin = null

        // if preview then must be newer version
        if (pre != null && !Number.isNaN(pre) && parseInt(pre) > 0) {
            sdk = sdk + 1
        }

        // PIE only supported at SDK than 16, so for lower we need no-pie
        if (sdk > 16) {
            minicapBin = 'minicap'
        } else {
            minicapBin = 'minicap-nopie'
        }

        let minicapPath = this.getPath('node_modules/minicap-prebuilt/prebuilt/' + abi + '/bin/' + minicapBin)
        let minicapSoPath = this.getPath('node_modules/minicap-prebuilt/prebuilt/' + abi + '/lib/android-' + sdk + '/minicap.so')

        await adbhelper.shell(this.serial, 'mkdir ' + this.tmpBinaryPath + ' 2>/dev/null || true')

        try {
            await adbhelper.pushFile(this.serial, minicapPath, this.tmpBinaryPath + '/' + minicapBin)
            await adbhelper.pushFile(this.serial, minicapSoPath, this.tmpBinaryPath + '/minicap.so')

            let res = await adbhelper.shell(this.serial, `chmod 777 ${this.tmpBinaryPath + '/' + minicapBin}`)
            let res2 = await adbhelper.shell(this.serial, `chmod 777 ${this.tmpBinaryPath + '/minicap.so'}`)
            this.minicapReady = true
        } catch (e) {
            this.minicapReady = false
        }
    }

    /**
     * Process Install Minitouch
     */
    async installMinitouch() {
        let abi = this.getProperties('ro.product.cpu.abi')
        let sdk = this.getProperties('ro.build.version.sdk')
        let minitouchBin = ''

        if (sdk > 16) {
            minitouchBin = 'minitouch'
        } else {
            minitouchBin = 'minitouch-nopie'
        }

        let minitouchPath = this.getPath('node_modules/minitouch-prebuilt/prebuilt/' + abi + '/bin/' + minitouchBin)

        await adbhelper.shell(this.serial, 'mkdir ' + this.tmpBinaryPath + ' 2>/dev/null || true')

        try {
            await adbhelper.pushFile(this.serial, minitouchPath, this.tmpBinaryPath + '/' + minitouchBin)
            let res = await adbhelper.shell(this.serial, `chmod 777 ${this.tmpBinaryPath + '/' + minitouchBin}`)
            this.minitouchReady = true
        } catch (e) {
            this.minitouchReady = false
        }
    }

    /**
     * Get Screen size
     */
    async getSize() {
        let response = {
            width: 0,
            height: 0
        }

        let size = await adbhelper.shell(this.serial, 'dumpsys window')
        size = size.match(/cur=[0-9]+x[0-9]+/g)

        if (size.length == 0) {
            let w = size.match(/DisplayWidth=[0-9]+/g)
            let h = size.match(/DisplayHeight=[0-9]+/g)

            if (w.length > 0 &&  h.length > 0) {

                size = w[0].replace('DisplayWidth=', '') + "x" + h[0].replace('DisplayHeight=', '')

            }
        } else {
            size = size[0].replace('cur=', '')
        }

        let wh = size.split('x')

        response.width = parseInt(wh[0])
        response.height = parseInt(wh[1])

        return response
    }

}

module.exports = DeviceProcessor;