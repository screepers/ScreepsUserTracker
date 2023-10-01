import fs from "fs";
import TerminalStoreBroker from "../broker/terminalStore.js";
import TransactionBroker from "../broker/transaction.js";
import TickBroker from "../broker/tick.js";

const baseDir = './src/testHelper/';
const mockTerminalStores = JSON.parse(fs.readFileSync(`${baseDir}terminalStores.json`, "utf8"));
const mockTransactions = JSON.parse(fs.readFileSync(`${baseDir}transactions.json`, "utf8"));

export default class TestHelper {
    static loadData() {
        mockTerminalStores.forEach(terminalStore => {
            console.log('terminal', terminalStore.tick, terminalStore.room)
            TerminalStoreBroker.receiveTerminalData(terminalStore);
        });

        mockTransactions.forEach(transaction => {
            console.log('transaction', transaction[1], transaction[2])
            TransactionBroker.receiveTransactionData(transaction[0], transaction[1], transaction[2]);
        });

        TickBroker.processAllTicks();
        TickBroker.garbageCollector();
    }
}