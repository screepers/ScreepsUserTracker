export default class TerminalStoreBroker {
    static completeTerminals = {};
    static terminals = {};
    static lastTick = 0;

    static receiveTerminalData(data) {
        if (data.tick > this.lastTick) this.lastTick = data.tick;

        if (!this.terminals[data.shard]) this.terminals[data.shard] = {};
        if (!this.terminals[data.shard][data.tick]) this.terminals[data.shard][data.tick] = {};

        const completeStore = this.completeTerminals[data.shard] && this.completeTerminals[data.shard][data.room] ? this.completeTerminals[data.shard][data.room] : {};
        if (!this.completeTerminals[data.shard]) this.completeTerminals[data.shard] = {};
        if (!this.completeTerminals[data.shard][data.room]) this.completeTerminals[data.shard][data.room] = data.terminalStore;

        const changesInStore = {};
        for (const resourceType in data.terminalStore) {
            if ((!completeStore[resourceType] && data.terminalStore[resourceType])) {
                changesInStore[resourceType] = data.terminalStore[resourceType];
            } else if (completeStore[resourceType] && !data.terminalStore[resourceType]) {
                changesInStore[resourceType] = -completeStore[resourceType];
            } else if (completeStore[resourceType] && data.terminalStore[resourceType] && completeStore[resourceType] - data.terminalStore[resourceType] !== 0) {
                changesInStore[resourceType] = data.terminalStore[resourceType] - completeStore[resourceType];
            }

            this.completeTerminals[data.shard][data.room][resourceType] = data.terminalStore[resourceType];
        }


        this.terminals[data.shard][data.tick][data.room] = changesInStore;
    }
} 