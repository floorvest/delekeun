const adbhelper = require('./AdbHelper')
const getport = require('get-port')

class TouchProcessor {

    constructor(serial, deviceProcessor) {
        this.serial = serial
        this.processor = deviceProcessor
    }

    async findOpenPort() {
        return await getport({
            port: getport.makeRange(34000, 44000)
        })
    }

    async run() {
        let port = await this.findOpenPort()
        let config = {
            port,
            maxPointer: {}
        }

        let command = `/data/local/tmp/delekeun/minitouch`
        let size = await adbhelper.getInstance().shell(this.serial, command)
        .then((stream) => {
            

            let res = new Promise((resolve) => {
                stream.on("data", (data) => {
                    let m = data.toString().match(/[0-9]+x[0-9]+/g)

                    if (m != null && m.length > 0) {
                        m = m[0].split('x')
                        resolve({
                            x: parseInt(m[0]),
                            y: parseInt(m[1])
                        })
                    }
                })
            })
            
            return res
        })

        config.maxPointer = size

        await adbhelper.getInstance().forward(this.serial, `tcp:${config.port}`, 'localabstract:minitouch')

        return config
    }

}

module.exports = TouchProcessor