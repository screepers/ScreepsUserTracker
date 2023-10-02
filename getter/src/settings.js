import fs from "fs";

const folderPath = "./files";
const filePath = `${folderPath}/settings.json`;

const settings = {};
export default settings;

export function writeSettings(receivedSettings) {
  fs.mkdirSync(folderPath, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(receivedSettings));

  const keys = Object.keys(receivedSettings);
  keys.forEach((key) => {
    settings[key] = receivedSettings[key];
  });
}
