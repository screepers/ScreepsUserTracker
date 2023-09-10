import graphite from "graphite";
const client = graphite.createClient(
    `plaintext://${process.env.GRAPHITE_HOST}/`
);

export default function Upload(data) {
    return new Promise((resolve) => {
        if (process.env.GRAPHITE_ONLINE !== "TRUE") return resolve();

        client.write(data, (err) => {
            if (err) console.log(err)
            resolve();
        });
    })
}