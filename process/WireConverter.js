const path = require('path')
const electron = require('electron')
const protobuf = require('protobufjs')

class WireConverter {

    constructor() {
        this.path = this.getPath('vendor/wire.proto')
    }
    
    getPath(p) {
        return path.join(electron.app.getAppPath(), p)
    }

    async getWire() {
        return this.find('jp.co.cyberagent.stf.proto')
    }

    async getEnvelope() {
        return this.find('jp.co.cyberagent.stf.proto.Envelope')
    }

    async getMessageType() {
        return this.find('jp.co.cyberagent.stf.proto.MessageType')
    }
    
    async find(pkg) {
        let root = await protobuf.load(this.path)

        return root.lookupType(pkg)
    }
    
    async load(data) {
        let Envelope = await this.getEnvelope()

        // let err = Envelope.verify(data)
        // if (err) return err
        
        return Envelope.decodeDelimited(data)

    }

    

}

module.exports = new WireConverter()