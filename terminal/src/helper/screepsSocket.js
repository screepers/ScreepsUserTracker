import { ScreepsAPI } from "screeps-api";
import TransactionBroker from "../broker/transaction.js";

export default async function StartSocket() {
    const api = new ScreepsAPI();
    await api.auth(process.env.SCREEPS_USERNAME, process.env.SCREEPS_PASSWORD);
    await api.socket.connect();

    api.socket.subscribe("console", (event) => {
        const {data} = event;
        if (!data || !event.data.messages || event.data.messages.log.length === 0)
            return;

        const detailedMarketData = event.data.messages.log.find((message) =>
            message.startsWith('[{"created')
        );
        if (!detailedMarketData) return;
        const gameTimeMessage = event.data.messages.log.find((message) =>
            message.startsWith('Game.time=')
        );
        if (!gameTimeMessage) return;
        const gameTime = gameTimeMessage.split('=')[1];
        const marketData = JSON.parse(detailedMarketData);

        TransactionBroker.receiveTransactionData(marketData, data.shard, gameTime);
    });
}