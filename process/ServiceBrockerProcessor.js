const net = require('net')
const wire = require('./WireConverter')
const { DelimitedStream, DelimitingStream } = require('./MessagePipe')

class ServiceBrockerProcessor {
    constructor(portService, portAgent) {
        this.port = {
            service: portService,
            agent: portAgent
        }

        this.serviceListener = () => {
            console.log('Not Listener exist')
        }
    }

    async connect() {
        await this.connectService()
        await this.connectAgent()
    }

    watchService(listener) {
        this.serviceListener = listener
    }

    // sendToService(channel, obj) {
    //     this.streamService.write(new wire.Envelope(
    //         obj.$code,
    //         obj.encode(),
    //         channel
    //     ).encodeNB())
    // }

    async connectService() {
        this.streamService = net.connect({
            port: this.port.service
        })

        // this.streamService.setEncoding('utf8')
        this.streamService.pipe(new DelimitingStream())
        this.streamServiceWriter = new DelimitingStream()

        this.streamServiceWriter.pipe(this.streamService)

        this.streamService.on('data', async (data) => {
            this.serviceListener(await wire.load(data))
        })

        
    }

    async connectAgent() {
        this.streamAgent = net.connect({
            port: this.port.agent
        })

        this.streamAgentWriter = new DelimitedStream()
        this.streamAgentWriter.pipe(this.streamAgent)
    }


    async press(keyCode) {
        let KeyEventRequest = await wire.find('jp.co.cyberagent.stf.proto.KeyEventRequest')
        let KeyEvent = await KeyEventRequest.lookup('KeyEvent').values

        this.reqKeyEvent(KeyEvent.PRESS, keyCode, KeyEventRequest)
    }

    async touchDown(keyCode) {
        let KeyEventRequest = await wire.find('jp.co.cyberagent.stf.proto.KeyEventRequest')
        let KeyEvent = KeyEventRequest.lookup('KeyEvent').values

        this.reqKeyEvent(KeyEvent.DOWN, keyCode, KeyEventRequest)
    }

    async touchUp(keyCode) {
        let KeyEventRequest = await wire.find('jp.co.cyberagent.stf.proto.KeyEventRequest')
        let KeyEvent = KeyEventRequest.lookup('KeyEvent').values


        this.reqKeyEvent(KeyEvent.UP, keyCode, KeyEventRequest)
    }

    async reqKeyEvent(KeyEvent, keyCode, KeyEventRequest) {
        let obj = KeyEventRequest.fromObject({
            event: KeyEvent,
            keyCode
        })

        let buffer = await KeyEventRequest.encode(obj).finish()

        this.streamAgent.write(await this.createEnvelope('DO_KEYEVENT', buffer))
    }

    async createEnvelope(MessageType, buffer, id) {
        let Envelope = await wire.getEnvelope()

        let obj = Envelope.fromObject({
            type: MessageType,
            message: Uint8Array.from(buffer),
            id
        })

        let arr = await Envelope.encodeDelimited(obj).finish()

        return arr
    }
    


}

module.exports = ServiceBrockerProcessor