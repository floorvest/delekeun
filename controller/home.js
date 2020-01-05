const { ipcRenderer, remote } = require('electron')
const $ = require('jquery')

const config = remote.require('./process/Configuration')
const adbhelper = remote.require('./process/AdbHelper')
const DeviceProcessor = remote.require('./process/DeviceProcessor')
const StreamProcessor = remote.require('./process/StreamProcessor')
const TouchProcessor = remote.require('./process/TouchProcessor')
const STFServiceProcessor = remote.require('./process/STFServiceProcessor')

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
        this.readyDevices = []
        
        this.initAdb();
    }

    findDeviceIndex (serial) {
        return this.readyDevices.findIndex((device) => {
            return device.id == serial
        })
    }

    async initAdb() {
        await adbhelper.download();

        let lists = await adbhelper.getList();

        await this.processDevice(lists);

        adbhelper.getInstance().trackDevices()
            .then((tracker) => {

                tracker.on('add', async (device) => {
                    console.log(device)
                    // if (device.type)

                    setTimeout(async () => {
                        device = await this.processDeviceOne(device)

                        this.renderView()
                    }, 1000)
                })

                tracker.on('remove', (device) => { 
                    this.removeDevice(device)
                })
            })
            .catch((err) => {
                console.error(err)
            })
        

        // adbhelper.watchList((devices) => {
            
        //     this.processDevice(devices);
        // }, (ev) => {
        //     self.loadingSpinner.show()
        // })
    }

    async removeDevice(device) {
        let serial = device.id
        let index = this.findDeviceIndex(device.id)

        if (index != -1) {
            this.readyDevices.splice(index, 1)
            ipcRenderer.send('deviceDisconnect', serial) 
        }

        this.renderView()
    }

    async processDeviceOne(device) {
        let deviceProcessor = new DeviceProcessor(device.id)

        await deviceProcessor.loadProp()

        let ready = await deviceProcessor.checkReadines()

        if (!ready.minicap) {
            await deviceProcessor.installMinicap()
        }

        if (!ready.minitouch) {
            await deviceProcessor.installMinitouch()
        }

        if (!ready.service_agent) {
            await deviceProcessor.installStfService()
        }

        this.loadedDevices[device.id] = deviceProcessor;

        device.model = deviceProcessor.getProperties('ro.product.model')
        device.name = deviceProcessor.getProperties('ro.product.name')

        if (this.findDeviceIndex(device.id) == -1) {
            this.readyDevices.push(device)
        }
        
        return device
    }

    async renderView() {
        if (this.readyDevices.length > 0) {
            this.messageNoDevice.hide()
            if (this.readyDevices.length == 1) {
                this.renderCenter(this.readyDevices[0])
            } else {
                this.renderDevices(this.readyDevices)
            }
        } else {
            this.messageNoDevice.show()
            this.centerDevice.hide()
        }

        this.loadingSpinner.hide()
    }

    async processDevice(devices) {
        
        for(let key in devices) {
            let device = devices[key]

            await this.processDeviceOne(device)
            // this.readyDevices.push(device)
        }

        this.renderView()
    }

    renderCenter(device) {
        let modelName = this.centerDevice.children('.model-name')
        let buttonView = this.centerDevice.find('.btn-view')
        let self = this

        buttonView.on('click', async () => {

            let spinner = buttonView.find('.spinner-border')
            spinner.show()

            buttonView.attr('disabled', 'true')

            let processor = this.loadedDevices[device.id]

            let streamer = new StreamProcessor(device.id, processor)

            let toucher = new TouchProcessor(device.id, processor)

            let stfService = new STFServiceProcessor(device.id, processor)

            let streamConfig = await streamer.stream()

            let toucherConfig = await toucher.run()

            let stfConfig = await stfService.run()

            let deviceData = {
                device,
                processor: this.loadedDevices[device.id],
                stream: streamConfig,
                streamProcessor: streamer,
                touch: toucherConfig,
                stfConfig,
                stfService
            }

            ipcRenderer.send('deviceRun',deviceData) 

            console.log(deviceData)

            spinner.hide()
            buttonView.removeAttr('disabled')
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