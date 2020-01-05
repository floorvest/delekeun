const electron = require('electron')
const ipcRendered = electron.ipcRenderer
const $ = require('jquery')
const RenderProcessor = electron.remote.require('./process/RenderProcessor')
const ScreenTouchProcessor = electron.remote.require('./process/ScreenTouchProcessor')
const ServiceBrockerProcessor = electron.remote.require('./process/ServiceBrockerProcessor')
const WireConverter = electron.remote.require('./process/WireConverter')
const currentWindow = electron.remote.getCurrentWindow();

class PhoneController {

    constructor() {

        this.batteryIndicator = {
            icon: $('#battery-indicator-icon'),
            value: $('#battery-indicator')
        }

        this.buttonContainer = {
            menu: $("#button-menu"),
            home: $("#button-home"),
            back: $("#button-back")
        }

        this.canvas = document.getElementById('canvas')
        this.canvasJquery = $(this.canvas)
        this.canvasContext = this.canvas.getContext('2d')

        this.disconnectBar = $('.background-disconnect')

        this.init()

        ipcRendered.on('deviceDisconnect', () => {
            this.disconnectBar.show()
            setTimeout(() => {
                currentWindow.close()
            }, 1000)
        });

        ipcRendered.on('refresh', (event, data) => {
            console.log(data)
            currentWindow.deviceData = data
        })

        window.addEventListener('beforeunload', (e) => {
            this.streamer.end()
            this.touch.end()
        })
    }

    init() {
        this.streamConfig = currentWindow.deviceData.stream
        this.touchConfig = currentWindow.deviceData.touch
        this.screenSize = currentWindow.deviceData.size
        this.realScreenSize = this.streamConfig.size
        this.stfConfig = currentWindow.deviceData.stfConfig

        this.mouseState = {
            drag: false,
            down: false,
            outside: false
        }

        
        this.streamer = new RenderProcessor(this.streamConfig)
        this.touch = new ScreenTouchProcessor(this.touchConfig)
        this.service = new ServiceBrockerProcessor(this.stfConfig.servicePort, this.stfConfig.agentPort)

        this.service.watchService(async (data) => {

            let wire = await WireConverter.getEnvelope()
            let MessageType = wire.lookup('MessageType').toJSON().values

            switch(MessageType[data.type]) {
                case 'EVENT_BATTERY':
                    let BatteryEvent = await WireConverter.find('jp.co.cyberagent.stf.proto.BatteryEvent')

                    let batteryValue = BatteryEvent.decode(data.message)
                    this.batteryIndicator.value.html(batteryValue.level + '%')
                    break;
                case 'EVENT_CONNECTIVITY':
                    let ConnectivityEvent = await WireConverter.find('jp.co.cyberagent.stf.proto.ConnectivityEvent')

                    console.log(ConnectivityEvent.decode(data.message))
                    break;

                case 'EVENT_ROTATION':
                    let RotationEvent = await WireConverter.find('jp.co.cyberagent.stf.proto.RotationEvent')

                    console.log(RotationEvent.decode(data.message))
                    break;
            }

            
        })

        this.buttonContainer.home.click((e) => {
            e.preventDefault()
            this.service.press(3)
        })

        this.buttonContainer.menu.click((e) => {
            e.preventDefault()

            this.service.press(82)
        })

        this.buttonContainer.back.click((e) => {
            e.preventDefault()
            this.service.press(4)
        })

        this.streamer.watchScreen((data) => {
            this.render(data)
        }, (err) => {
            console.error(err)
        })

        this.canvasJquery.mousedown((e) => {
            this.mouseState.down = true
            this.mouseState.outside = false
            const cords = this.getCoordinates(this.canvas, e)
            this.touch.click(cords.x, cords.y)
        });

        this.canvasJquery.mousemove((e) => {
            if (this.mouseState.down && !this.mouseState.outside) {
                const cords = this.getCoordinates(this.canvas, e)
                this.touch.move(cords.x, cords.y)
            }
        })

        this.canvasJquery.mouseup((e) => {
            this.mouseState.down = false
            this.mouseState.outside = false
            this.touch.up()
        })

        this.canvasJquery.mouseleave((e) => {

            if (this.mouseState.down) {
                this.mouseState.down = false
                this.mouseState.outside = true
                this.touch.up()
            }
            
        })

        this.streamer.render()
        this.service.connect()

        // window.on('resize', () => {
        //     let size = window.getSize()

        //     this.screenSize.width = size[0]
        //     this.screenSize.height = size[1]
        // })

    }

    getCoordinates(canvas, event) {
        const rect = canvas.getBoundingClientRect()
        const x = event.clientX - rect.left
        const y = event.clientY - rect.top

        const pX = (x / this.canvas.width ) * 100
        const pY = (y / this.canvas.height) * 100

        const rX = (this.touchConfig.maxPointer.x * pX) / 100
        const rY = (this.touchConfig.maxPointer.y * pY) / 100

        return {
            x: Math.round(rX),
            y: Math.round(rY)
        }
    }

    render(data) {
        let blob = new Blob([data], {type: 'image/jpeg'})
        let URL = window.URL || window.webkitURL

        let img = new Image()
        img.onload = () => {
            // this.canvasContext.imageSmoothingEnabled = false
            let w = this.screenSize.width
            let h = this.screenSize.height
            this.canvasContext.imageSmoothingEnabled = false
            this.canvas.width = w
            this.canvas.height = h
            this.canvasContext.drawImage(img, 0, 0, w, h)
            img.onload = null
            blob = null
        }

        let u = URL.createObjectURL(blob)
        img.src = u
    }

    end() {
        this.streamer.end()
    }

}

let win = new PhoneController()

window.onbeforeunload = () => {
    win.end()
}