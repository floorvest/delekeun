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
        }

        let command = `/data/local/tmp/delekeun/minitouch`
        adbhelper.shell(this.serial, command)
                .then((output) => {
                    console.log('MINITOUCH!')
                    console.log(output)
                })

        await adbhelper.getInstance().forward(this.serial, `tcp:${config.port}`, 'localabstract:minitouch')

        return config
    }

}

module.exports = TouchProcessor