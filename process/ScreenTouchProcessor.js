const net = require('net')

class ScreenTouchProcessor {
    constructor(config) {
        this.config = config
        
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
    }

    end () {
        if (this.stream != null) {
            this.stream.end()
        }
    }

    sleep(ms) {
        return(
            new Promise(function(resolve, reject)
            {
                setTimeout(function() { resolve(); }, ms);
            })
        );
    }

    execute(command) {
        this.sleep(10).then(() => {
            this.stream.write(`${command} \nc \n`)
        })
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