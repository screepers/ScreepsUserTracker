export default class TransactionBroker {
    static completeTransactions = {};
    static transactions = {};
    static lastTick = 0;

    static receiveTransactionData(orders, shard, tick) {
        if (tick > this.lastTick) this.lastTick = tick;
        if (!this.transactions[shard]) this.transactions[shard] = {};

        const seenTransactions = [];

        for (let o = 0; o < orders.length; o++) {
            const order = orders[o];
            if (!this.completeTransactions[shard]) this.completeTransactions[shard] = {};
            if (!this.completeTransactions[shard][order.id]) this.completeTransactions[shard][order.id] = order;

            seenTransactions.push(order.id);
            if (!order.roomName || order.remainingAmount === order.amount) continue;

            if (!this.transactions[shard]) this.transactions[shard] = {};
            if (!this.transactions[shard][tick]) this.transactions[shard][tick] = {};
            if (!this.transactions[shard][tick][order.roomName]) this.transactions[shard][tick][order.roomName] = {};

            const originalTransaction = this.completeTransactions[shard][order.id];

            if (originalTransaction.remainingAmount > order.remainingAmount) {
                this.transactions[shard][tick][order.roomName][order.id] = {
                    created: order.created,
                    amount: order.amount,
                    price: order.price,
                    remainingAmount: order.remainingAmount,
                    resourceType: order.resourceType,
                    type: order.type,
                    difference: originalTransaction.remainingAmount - order.remainingAmount,
                }
            }
            if (order.remainingAmount === 0) delete this.completeTransactions[shard][order.id];
            else this.completeTransactions[shard][order.id] = order;
        }

        const allTransactionIds = Object.keys(this.completeTransactions[shard]);
        const seenTransactionsSet = new Set(seenTransactions);

        const uniqueValuesInAllTransactionIds = allTransactionIds.filter(item => !seenTransactionsSet.has(item));
        for (let i = 0; i < uniqueValuesInAllTransactionIds.length; i++) {
            const transactionId = uniqueValuesInAllTransactionIds[i];
            const transaction = this.completeTransactions[shard][transactionId];

            this.transactions[shard][tick][transaction.roomName][transaction.id] = {
                created: transaction.created,
                amount: transaction.amount,
                price: transaction.price,
                remainingAmount: transaction.remainingAmount,
                resourceType: transaction.resourceType,
                type: transaction.type,
                difference: transaction.remainingAmount,
            }
            delete this.completeTransactions[shard][transactionId];
        }
    }
}