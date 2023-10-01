import { CronJob } from "cron";
import Upload from "../helper/upload.js";
import TerminalStoreBroker from "./terminalStore.js";
import TransactionBroker from "./transaction.js";

export default class TickBroker {
  static garbageCollector() {
    const { terminals } = TerminalStoreBroker;
    const lastTerminalTick = TerminalStoreBroker.lastTick;

    const { transactions } = TransactionBroker;
    const lastTransactionTick = TransactionBroker.lastTick;
    const lastTick = Math.min(lastTerminalTick, lastTransactionTick)

    // Case 1:
    // If last tick more then ...k ticks ago (based on last set tick), delete terminal store
    let shardKeys = Object.keys(terminals);
    for (let i = 0; i < shardKeys.length; i += 1) {
      const shard = shardKeys[i];
      const shardTerminals = terminals[shard];
      const tickKeys = Object.keys(shardTerminals);
      for (let j = 0; j < tickKeys.length; j += 1) {
        const tick = tickKeys[j];
        if (tick + 10 * 1000 < lastTick) delete shardTerminals[tick];
      }
    }

    // Case 2:
    // If last tick more then ...k ticks ago (based on last set tick), delete transactions
    shardKeys = Object.keys(transactions);
    for (let i = 0; i < shardKeys.length; i += 1) {
      const shard = shardKeys[i];
      const shardTransactions = transactions[shard];
      const tickKeys = Object.keys(shardTransactions);
      for (let j = 0; j < tickKeys.length; j += 1) {
        const tick = tickKeys[j];
        if (tick + 5 * 1000 < lastTick) delete shardTransactions[tick];
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

    let roomNameKeys = Object.keys(terminals);
    for (let i = 0; i < roomNameKeys.length; i += 1) {
      const roomName = roomNameKeys[i];
      const resourceTypes = terminals[roomName];
      const resourceTypeKeys = Object.keys(resourceTypes);
      for (let j = 0; j < resourceTypeKeys.length; j += 1) {
        const resourceType = resourceTypeKeys[j];
        const amount = Math.abs(resourceTypes[resourceType]);
        // eslint-disable-next-line no-continue
        if (amount === 0) continue;

        if (!groupedByResourceTypeByAmount[resourceType]) groupedByResourceTypeByAmount[resourceType] = {};
        if (!groupedByResourceTypeByAmount[resourceType][amount]) groupedByResourceTypeByAmount[resourceType][amount] = [];
        groupedByResourceTypeByAmount[resourceType][amount].push(roomName);
      }
    }

    // 2
    // Loop through all transactions and check if the source terminal had the desired resource change, then find using the grouped data the room where the resources came/went to.
    roomNameKeys = Object.keys(transactions);
    for (let i = 0; i < roomNameKeys.length; i += 1) {
      const roomName = roomNameKeys[i];
      const roomTransactions = transactions[roomName];
      const transactionIdKeys = Object.keys(roomTransactions);
      for (let j = 0; j < transactionIdKeys.length; j += 1) {
        const transactionId = transactionIdKeys[j];
        const transaction = roomTransactions[transactionId];
        const { resourceType, difference } = transaction;

        if (!groupedByResourceTypeByAmount[resourceType] || !groupedByResourceTypeByAmount[resourceType][difference]) {
          // Order was canceled, expired or something else.
          // eslint-disable-next-line no-continue
          continue;
        }

        const possibleRooms = groupedByResourceTypeByAmount[resourceType][difference].filter(room => room !== roomName);
        if (possibleRooms.length === 0) {
          // Something went wrong, no room found.
          // eslint-disable-next-line no-continue
          continue;
        }
        else if (possibleRooms.length > 1) {
          // Cant determine the room, multiple rooms found.
          // eslint-disable-next-line no-continue
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


    console.log(`Found ${ordersFound.length} out of ${totalTransactionsToBeFound} orders for tick ${tick} on shard "${shard}"`)

    Upload(ordersFoundObject)

    delete TerminalStoreBroker.terminals[shard][tick];
    delete TransactionBroker.transactions[shard][tick];
  }

  static processAllTicks() {
    const { terminals } = TerminalStoreBroker;
    const { transactions } = TransactionBroker;

    const shardKeys = Object.keys(transactions);
    for (let i = 0; i < shardKeys.length; i += 1) {
      const shard = shardKeys[i];
      const shardTransactions = transactions[shard];
      // eslint-disable-next-line no-continue
      if (!terminals[shard]) continue;

      const tickKeys = Object.keys(shardTransactions);
      for (let j = 0; j < tickKeys.length; j += 1) {
        const tick = tickKeys[j];
        // eslint-disable-next-line no-continue
        if (!terminals[shard][tick]) continue;
        this.processTick(shard, tick);
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