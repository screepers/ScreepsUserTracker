export function sleep(ms) {
  // eslint-disable-next-line no-promise-executor-return
  return new Promise((resolve) => setTimeout(resolve, ms));
}
export function cleanSource(data) {
  return JSON.parse(JSON.stringify(data));
}