import fs from "fs";

const filesFolder = "files";

const defaultActionFiles = [];
// get all files which start with defaultActions in files folder
fs.readdirSync(filesFolder).forEach(file => {
  if (file.startsWith("defaultActions")) {
    defaultActionFiles.push(file);
  }
});

function generateMd(data, md = "", depth = 0) {
  for (const key in data) {
    if (typeof data[key] === "object") {
      md += `\n#${"#".repeat(depth + 1)} ${key}\n\n`;
      md = generateMd(data[key], md, depth + 1);
    } else {
      md += `- ${key}\n`;
    }
  }
  return md;
}

function groupObjects(data, object) {
  for (const key in data) {
    if (typeof data[key] === "object") {
      if (!object[key]) {
        object[key] = {};
      }
      object[key] = groupObjects(data[key], object[key]);
    } else {
      object[key] = "";
    }
  }
  return object;
}

let complete = {};
for (let f = 0; f < defaultActionFiles.length; f++) {
  const data = {};
  const fileName = defaultActionFiles[f];
  const text = fs.readFileSync(`${filesFolder}/${fileName}`, "utf8");
  const json = JSON.parse(text);

  for (let i = 0; i < json.length; i++) {
    const action = json[i];
    const splitPath = action.path.split(".");

    let local = data;
    for (let j = 0; j < splitPath.length; j++) {
      const key = splitPath[j];
      if (j === splitPath.length - 1) {
        local[key] = "";
      } else {
        if (!local[key]) {
          local[key] = {};
        }
        local = local[key];
      }
    }
  }

  const md = `# ${fileName}\n${generateMd(data)}\n`;
  const type = fileName.split(".")[1];
  fs.writeFileSync(`DATA.${type}.md`, md);
  console.log(`${type} data written to DATA.${type}.md`);

  complete = groupObjects(data, complete || {});
}

const md = `# Complete Data\n${generateMd(complete)}\n`;
fs.writeFileSync(`DATA.md`, md);
console.log(`Complete data written to DATA.md`);
