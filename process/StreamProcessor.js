const adbhelper = require('./AdbHelper')
const getport = require('get-port')

class StreamProcessor {

    constructor(serial, deviceProcessor) {
        this.serial = serial
        this.processor = deviceProcessor
    }

    async findOpenPort() {
        return await getport({
            port: getport.makeRange(34000, 44000)
        })
    }

    async stream(desireRes) {
        let port = await this.findOpenPort()

        let size = await this.processor.getSize()

        let res = {
            width: 500,
            height: 800
        }

        if (desireRes != undefined) {
            res.width = desireRes.width
            res.height = desireRes.height
        }

        res = {
            width: res.width,
            height: Math.round(((size.height / size.width) * res.width))
        }

        // let res = size

        if (size.width > 0 && size.height > 0) {
            let command = `LD_LIBRARY_PATH=/data/local/tmp/delekeun /data/local/tmp/delekeun/minicap -P ${size.width}x${size.height}@${res.width}x${res.height}/0`
            adbhelper.shell(this.serial, command)
                    .then((output) => {
                        console.log(output)
                    })

            adbhelper.getInstance().forward(this.serial, `tcp:${port}`, 'localabstract:minicap')
        }

        return {
            port,
            res,
            serial: this.serial
        }
    }


}


module.exports = StreamProcessor