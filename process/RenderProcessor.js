const net = require('net')

class RenderProcessor {

    constructor(streamConfig) {
        this.stream = streamConfig

        this.listener = () => {
            console.log('Not Listening')
        };

        this.error = () => {
            console.log('Not Listening Error')
        };

        this.reInit()
    }

    reInit() {
        this.readBannerBytes = 0
        this.bannerLength = 2
        this.readFrameBytes = 0
        this.frameBodyLength = 0
        this.frameBody = new Buffer(0)
        this.banner = {
            version: 0
            , length: 0
            , pid: 0
            , realWidth: 0
            , realHeight: 0
            , virtualWidth: 0
            , virtualHeight: 0
            , orientation: 0
            , quirks: 0
        }
    }

    watchScreen(listener, error) {
        this.listener = listener
        this.error = error
    }

    readData(stream) {
        let self = this;
        for (var chunk; (chunk = stream.read());) {
            // console.info('chunk(length=%d)', chunk.length)
            for (var cursor = 0, len = chunk.length; cursor < len;) {
              if (this.readBannerBytes < this.bannerLength) {
                switch (this.readBannerBytes) {
                case 0:
                  // version
                  this.banner.version = chunk[cursor]
                  break
                case 1:
                  // length
                  this.banner.length = this.bannerLength = chunk[cursor]
                  break
                case 2:
                case 3:
                case 4:
                case 5:
                  // pid
                  this.banner.pid +=
                    (chunk[cursor] << ((this.readBannerBytes - 2) * 8)) >>> 0
                  break
                case 6:
                case 7:
                case 8:
                case 9:
                  // real width
                  this.banner.realWidth +=
                    (chunk[cursor] << ((this.readBannerBytes - 6) * 8)) >>> 0
                  break
                case 10:
                case 11:
                case 12:
                case 13:
                  // real height
                  this.banner.realHeight +=
                    (chunk[cursor] << ((this.readBannerBytes - 10) * 8)) >>> 0
                  break
                case 14:
                case 15:
                case 16:
                case 17:
                  // virtual width
                  this.banner.virtualWidth +=
                    (chunk[cursor] << ((this.readBannerBytes - 14) * 8)) >>> 0
                  break
                case 18:
                case 19:
                case 20:
                case 21:
                  // virtual height
                  this.banner.virtualHeight +=
                    (chunk[cursor] << ((this.readBannerBytes - 18) * 8)) >>> 0
                  break
                case 22:
                  // orientation
                  this.banner.orientation += chunk[cursor] * 90
                  break
                case 23:
                  // quirks
                  this.banner.quirks = chunk[cursor]
                  break
                }
      
                cursor += 1
                this.readBannerBytes += 1
      
                if (this.readBannerBytes === this.bannerLength) {
                //   console.log('banner', this.banner)
                }
              }
              else if (this.readFrameBytes < 4) {
                this.frameBodyLength += (chunk[cursor] << (this.readFrameBytes * 8)) >>> 0
                cursor += 1
                this.readFrameBytes += 1
                // console.info('headerbyte%d(val=%d)', this.readFrameBytes, this.frameBodyLength)
              }
              else {
                if (len - cursor >= this.frameBodyLength) {
                //   console.info('bodyfin(len=%d,cursor=%d)', this.frameBodyLength, cursor)
      
                  this.frameBody = Buffer.concat([
                    this.frameBody
                  , chunk.slice(cursor, cursor + this.frameBodyLength)
                  ])
      
                  // Sanity check for JPG header, only here for debugging purposes.
                  if (this.frameBody[0] !== 0xFF || this.frameBody[1] !== 0xD8) {
                    // console.error(
                    //   'Frame body does not start with JPG header', this.frameBody)
                    this.error('Frame body does not start with JPG header')
                  }
                  
                  // console.log('Send to main stream')
                  self.listener(this.frameBody)
      
                  cursor += this.frameBodyLength
                  this.frameBodyLength = this.readFrameBytes = 0
                  this.frameBody = new Buffer(0)
                }
                else {
                  // console.info('body(len=%d)', len - cursor)
      
                  this.frameBody = Buffer.concat([
                    this.frameBody
                  , chunk.slice(cursor, len)
                  ])
      
                  this.frameBodyLength -= len - cursor
                  this.readFrameBytes += len - cursor
                  cursor = len
                }
              }
            }
          }
    }

    render() {
        // this.reInit()
        this.streamInstance = net.connect({
            port: this.stream.port
        })

        this.streamInstance.on('error', (err) => {
            this.error(err)
        })

        this.streamInstance.on('readable', () => {
            this.readData(this.streamInstance)
        })
    }

    end() {
        if (this.streamInstance != null) {
            this.streamInstance.end()
        }
    }


}

module.exports = RenderProcessor