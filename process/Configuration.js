const Store = require('electron-store');

class Configuration {
    constructor() {
        const schema = {
            appName: {
                type: 'string'
            }
        };
        
        this.store = new Store({schema});
    }

    getInstance() {
        return this.store;
    }
}


module.exports = new Configuration();
