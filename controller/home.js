const { ipcRenderer, remote } = require('electron')
const $ = require('jquery')

const config = remote.require('./process/Configuration')
const adbhelper = remote.require('./process/AdbHelper')
const DeviceProcessor = remote.require('./process/DeviceProcessor')
const StreamProcessor = remote.require('./process/StreamProcessor')
const TouchProcessor = remote.require('./process/TouchProcessor')

class HomeController {
    constructor() {
        this.loadingSpinner = $("#loading-spinner")
        this.loadingSpinner.hide()
        this.centerDevice = $("#center-device")
        this.messageNoDevice = $("#message-no-device")
        this.homeTitle = document.getElementById("hometitle");
        this.navbarTitle = document.getElementById("navbarTitle");

        this.navbarTitle.innerHTML = config.getInstance().get('appName');
        this.homeTitle.innerHTML = config.getInstance().get('appName');

        this.loadedDevices = {}
        
        this.initAdb();
    }

    async initAdb() {
        await adbhelper.download();

        let lists = await adbhelper.getList();

        await this.processDevice(lists);

        let self = this

        adbhelper.watchList((devices) => {
            
            this.processDevice(devices);
        }, (ev) => {
            self.loadingSpinner.show()
        })
    }

    async processDevice(devices) {
        for(let key in devices) {
            let device = devices[key]

            let deviceProcessor = new DeviceProcessor(device.id)

            await deviceProcessor.loadProp()

            let ready = await deviceProcessor.checkReadines()

            if (!ready.minicap) {
                await deviceProcessor.installMinicap()
            }

            if (!ready.minitouch) {
                await deviceProcessor.installMinitouch()
            }

            this.loadedDevices[device.id] = deviceProcessor;

            device.model = deviceProcessor.getProperties('ro.product.model') 
        }

        if (devices.length > 0) {
            this.messageNoDevice.hide()
            if (devices.length == 1) {
                this.renderCenter(devices[0])
            } else {
                this.renderDevices(devices)
            }
        } else {
            this.messageNoDevice.show()
            this.centerDevice.hide()
        }

        this.loadingSpinner.hide()
    }

    renderCenter(device) {
        let modelName = this.centerDevice.children('.model-name')
        let buttonView = this.centerDevice.find('.btn-view')
        let self = this

        buttonView.on('click', async () => {

            let processor = this.loadedDevices[device.id]

            let streamer = new StreamProcessor(device.id, processor)

            let toucher = new TouchProcessor(device.id, processor)

            let streamConfig = await streamer.stream()

            let toucherConfig = await toucher.run()

            ipcRenderer.send('deviceRun', {
                device,
                processor: this.loadedDevices[device.id],
                stream: streamConfig,
                streamProcessor: streamer,
                touch: toucherConfig
            })

        }
        );

        modelName.html(device.model)
        this.centerDevice.show()
        
    }

    renderDevices(devices) {

        let devicesContainer = $(".devices-container")
        let child = devicesContainer.children('.device').clone()
        devicesContainer.empty()

        for (var i in devices) {
            let device = devices[i]

            let c = child.clone()
            c.html(device.model)

            devicesContainer.append(c)
        }

    }
}


new HomeController();