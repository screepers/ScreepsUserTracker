import { CronJob } from "cron";
import Upload from "../helper/upload.js";
import TerminalStoreBroker from "./terminalStore.js";
import TransactionBroker from "./transaction.js";

export default class TickBroker {
    static garbageCollector() {
        const terminals = TerminalStoreBroker.terminals;
        const lastTerminalTick = TerminalStoreBroker.lastTick;

        const transactions = TransactionBroker.transactions;
        const lastTransactionTick = TransactionBroker.lastTick;
        const lastTick = Math.min(lastTerminalTick, lastTransactionTick)

        // Case 1:
        // If last tick more then ...k ticks ago (based on last set tick), delete terminal store
        for (const shard in terminals) {
            if (Object.hasOwnProperty.call(terminals, shard)) {
                const shardTerminals = terminals[shard];
                for (const tick in shardTerminals) {
                    if (Object.hasOwnProperty.call(shardTerminals, tick)) {
                        if (tick + 10 * 1000 < lastTick) delete shardTerminals[tick];
                    }
                }
            }
        }

        // Case 2:
        // If last tick more then ...k ticks ago (based on last set tick), delete transactions
        for (const shard in transactions) {
            if (Object.hasOwnProperty.call(transactions, shard)) {
                const shardTransactions = transactions[shard];
                for (const tick in shardTransactions) {
                    if (Object.hasOwnProperty.call(shardTransactions, tick)) {
                        if (tick + 5 * 1000 < lastTick) delete shardTransactions[tick];
                    }
                }
            }
        }
    }

    static processTick(shard, tick) {
        const terminals = TerminalStoreBroker.terminals[shard][tick];
        const transactions = TransactionBroker.transactions[shard][tick];
        const totalTransactionsToBeFound = Object.keys(transactions).length;

        const ordersFound = [];
        const ordersFoundObject = [];
        const groupedByResourceTypeByAmount = {};

        for (const roomName in terminals) {
            if (Object.hasOwnProperty.call(terminals, roomName)) {
                const resourceTypes = terminals[roomName];
                for (const resourceType in resourceTypes) {
                    if (Object.hasOwnProperty.call(resourceTypes, resourceType)) {
                        const amount = Math.abs(resourceTypes[resourceType]);
                        if (amount === 0) continue;

                        if (!groupedByResourceTypeByAmount[resourceType]) groupedByResourceTypeByAmount[resourceType] = {};
                        if (!groupedByResourceTypeByAmount[resourceType][amount]) groupedByResourceTypeByAmount[resourceType][amount] = [];
                        groupedByResourceTypeByAmount[resourceType][amount].push(roomName);
                    }
                }
            }
        }

        // 2
        // Loop through all transactions and check if the source terminal had the desired resource change, then find using the grouped data the room where the resources came/went to.
        for (const roomName in transactions) {
            if (Object.hasOwnProperty.call(transactions, roomName)) {
                const roomTransactions = transactions[roomName];
                for (const transactionId in roomTransactions) {
                    if (Object.hasOwnProperty.call(roomTransactions, transactionId)) {
                        const transaction = roomTransactions[transactionId];
                        const { resourceType, difference } = transaction;

                        if (!groupedByResourceTypeByAmount[resourceType] || !groupedByResourceTypeByAmount[resourceType][difference]) {
                            // Order was canceled, expired or something else.
                            continue;
                        }

                        const possibleRooms = groupedByResourceTypeByAmount[resourceType][difference].filter(room => room !== roomName);
                        if (possibleRooms.length === 0) {
                            // Something went wrong, no room found.
                            continue;
                        }
                        else if (possibleRooms.length > 1) {
                            // Cant determine the room, multiple rooms found.
                            continue;
                        }

                        const targetRoom = possibleRooms[0];
                        ordersFound.push({
                            transaction,
                            fromRoom: transaction.type === "sell" ? roomName : targetRoom,
                            toRoom: transaction.type === "sell" ? targetRoom : roomName,
                        });
                    }
                }
            }
        }


        console.log(`Found ${ordersFound.length} out of ${totalTransactionsToBeFound} orders for tick ${tick} on shard "${shard}"`)

        Upload(ordersFoundObject)

        delete TerminalStoreBroker.terminals[shard][tick];
        delete TransactionBroker.transactions[shard][tick];
    }
    static processAllTicks() {
        const terminals = TerminalStoreBroker.terminals;
        const transactions = TransactionBroker.transactions;

        for (const shard in transactions) {
            if (Object.hasOwnProperty.call(transactions, shard)) {
                const shardTransactions = transactions[shard];
                if (!terminals[shard]) continue;

                for (const tick in shardTransactions) {
                    if (Object.hasOwnProperty.call(shardTransactions, tick)) {
                        if (!terminals[shard][tick]) continue;
                        this.processTick(shard, tick);
                    }
                }
            }
        }
    }
}

const garbageCollector = new CronJob(
    "*/10 * * * *",
    TickBroker.garbageCollector,
    null,
    false,
    "Europe/Amsterdam"
);
garbageCollector.start();

const processAllData = new CronJob(
    "*/10 * * * *",
    TickBroker.processAllTicks,
    null,
    false,
    "Europe/Amsterdam"
);
processAllData.start();