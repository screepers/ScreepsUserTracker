import fs from "fs"

const folderPath = "./files"
const filePath = folderPath+"/settings.json"

const settings = {}
export default settings

export function writeSettings(recievedSettings) {
    fs.mkdirSync(folderPath, { recursive: true })
    fs.writeFileSync(filePath, JSON.stringify(recievedSettings));

    const keys = Object.keys(recievedSettings);
    keys.forEach(key => {
        settings[key] = recievedSettings[key]
    });
}