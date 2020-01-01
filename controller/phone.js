const electron = require('electron')
const screen = electron.screen
const $ = require('jquery')
const RenderProcessor = electron.remote.require('./process/RenderProcessor')
const ScreenTouchProcessor = electron.remote.require('./process/ScreenTouchProcessor')
const currentWindow = electron.remote.getCurrentWindow();



class PhoneController {

    constructor() {
        this.canvas = document.getElementById('canvas')
        this.canvasJquery = $(this.canvas)
        this.canvasContext = this.canvas.getContext('2d')

        this.streamConfig = currentWindow.deviceData.stream
        this.touchConfig = currentWindow.deviceData.touch
        this.screenSize = currentWindow.deviceData.size
        
        console.log(currentWindow.deviceData)

        this.mouseState = {
            drag: false,
            down: false,
            outside: false
        }
        
        this.streamer = new RenderProcessor(this.streamConfig)
        this.touch = new ScreenTouchProcessor(this.touchConfig)

        this.streamer.watchScreen((data) => {
            this.render(data)
        }, (err) => {
            console.error(err)
        })

        this.canvasJquery.mousedown((e) => {
            this.mouseState.down = true
            this.mouseState.outside = false
            console.log('Click', e)
            this.touch.click(10, 10)
        });

        this.canvasJquery.mousemove((e) => {
            if (this.mouseState.down && !this.mouseState.outside) {
                console.log('Move', e)
            }
        })

        this.canvasJquery.mouseup((e) => {
            this.mouseState.down = false
            this.mouseState.outside = false
            this.touch.up()
            console.log('Remove', e)
        })

        this.canvasJquery.mouseleave((e) => {

            if (this.mouseState.down) {
                this.mouseState.down = false
                this.mouseState.outside = true
                this.touch.up()
                console.log('Outside')
            }
            
        })

        this.streamer.render()
    }

    render(data) {
        let blob = new Blob([data], {type: 'image/png'})
        let URL = window.URL || window.webkitURL

        let img = new Image()
        img.onload = () => {
            this.canvasContext.imageSmoothingEnabled = false
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