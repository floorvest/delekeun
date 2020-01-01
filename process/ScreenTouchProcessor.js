const net = require('net')

class ScreenTouchProcessor {
    constructor(config) {
        this.config = config
        console.log(config)
        setTimeout(() => {
            this.connect()
        }, 800)
    }

    connect() {
        this.stream = net.connect({
            port: this.config.port
        })

        this.stream.setEncoding('utf8')

        this.stream.on('error', console.error)

        // this.click(0, 0)
        // this.up()
    }

    execute(command) {
        
        this.stream.write(`${command} \nc \n`)
        console.log(command)
    }

    click(x, y) {
        this.execute(`d 0 ${x} ${y} 100`)
    }

    move(x, y) {
        this.execute(`m 0 ${x} ${y} 100`)
    }

    up() {
        this.execute('u 0')
    }
}

module.exports = ScreenTouchProcessor