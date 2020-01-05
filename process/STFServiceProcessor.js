const adbhelper = require('./AdbHelper')
const getport = require('get-port')

class STFServiceProcessor {

    constructor(serial, processor) {
        this.tryService = 0
        this.tryAgent = 0
        this.serial = serial
        this.processor = processor
    }

    async findOpenPort() {
        return await getport({
            port: getport.makeRange(34000, 44000)
        })
    }

    async run() {
        let config = {
            servicePort: 0,
            agentPort: 0
        }

        config.servicePort = await this.runService()
        config.agentPort = await this.runAgent()

        return config
    }

    async runService(port) {
        return new Promise(async (resolve, reject) => {

            if (this.tryService > 4) {
                this.tryService = 0
                reject('Timeout trying')
                return
            }

            if (port == null) {
                port = await this.findOpenPort()        
            }

            adbhelper.shell(this.serial, 'am startservice --user 0 -a jp.co.cyberagent.stf.ACTION_START -n jp.co.cyberagent.stf/.Service')
            .then((data) => {
                // console.log(data)
            }, (err) => {
                console.error(err)
                this.tryService++
                this.runService(port)
            })

            setTimeout(() => {
                adbhelper.getInstance().forward(this.serial, `tcp:${port}`, 'localabstract:stfservice')
                resolve(port)
            }, 800)
        })
    }

    async runAgent(port) {
        let path = await adbhelper.shell(this.serial, 'pm path jp.co.cyberagent.stf')
        path = path.replace('package:', '')

        return new Promise(async (resolve, reject) => {
            if (this.tryAgent > 4) {
                this.tryAgent = 0
                reject('Try timeout agent')
                return
            }

            if (port == null) {
                port = await this.findOpenPort()
            }

            adbhelper.getInstance().shell(this.serial, `export CLASSPATH="${path}"; exec app_process /system/bin jp.co.cyberagent.stf.Agent`)
                .then((stream) => {
                    
                    stream.on('data', (data) => {
                        console.log(data.toString())
                    })

                }, (err) => {
                    console.error(err)
                    this.tryAgent++
                    this.runAgent(port)
                })

            setTimeout(() => {
                adbhelper.getInstance().forward(this.serial, `tcp:${port}`, 'localabstract:stfagent')
                resolve(port)
            }, 800)
        })
    }

    end() {
        adbhelper.shell(this.serial, 'am force-stop jp.co.cyberagent.stf')
    }

}

module.exports = STFServiceProcessor