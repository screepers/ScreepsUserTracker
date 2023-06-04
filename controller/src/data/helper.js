import * as dotenv from "dotenv";

dotenv.config();

export function GetShards() {
  return process.env.SHARDS.split(" ");
}

export const STRUCTURE_TYPES = [
  "road",
  "wall",
  "spawn",
  "extension",
  "link",
  "storage",
  "tower",
  "observer",
  "powerSpawn",
  "extractor",
  "lab",
  "terminal",
  "container",
  "nuker",
];
export function findOriginalObject(id, ticks) {
  const tickKeys = Object.keys(ticks);
  for (let t = 0; t < tickKeys.length; t += 1) {
    const tickKey = tickKeys[t];
    const tick = ticks[tickKey];
    if (tick && tick[id]) {
      return tick[id];
    }
  }
  return null;
}

export function findAllByType(objects, type) {
  let possibleTypes = [type];
  if (type === "structure") {
    possibleTypes = STRUCTURE_TYPES;
    possibleTypes.push("controller");
  }
  const list = Object.values(objects).filter(
    (o) => o && o.type && possibleTypes.includes(o.type)
  );
  return list;
}

export function groupBy(obj, key) {
  const result = {};
  obj.forEach((o) => {
    if (!result[o[key]]) result[o[key]] = [];
    result[o[key]].push(o);
  });
  return result;
}

export function getIntentEffect(action, originalObject) {
  try {
    switch (action) {
      case "harvest":
        return { action, energy: originalObject.body.work * 2 };
      case "build":
        return { action, energy: originalObject.body.work * 5 };
      case "repair":
        if (originalObject.type === "tower") {
          return { action, energy: 10 };
        }
        return { action, energy: originalObject.body.work * 1 };
      case "upgradeController":
        return { action, energy: originalObject.body.work * 1 };
      case "dismantle":
        return { action, energy: originalObject.body.work * 0.25 };
      case "attack":
        if (originalObject.type === "tower") {
          return { action, energy: 10, damage: 300 };
        }
        return { action, damage: originalObject.body.attack * 30 };
      case "rangedAttack":
        return { action, damage: originalObject.body.rangedAttack * 10 };
      case "rangedMassAttack":
        return { action, damage: originalObject.body.rangedAttack * 4 };
      case "heal":
        if (originalObject.type === "tower") {
          return { action, energy: 10, damage: 200 };
        }
        return { action, damage: originalObject.body.heal * 12 };
      case "rangedHeal":
        return { action, damage: originalObject.body.heal * 4 };
      default:
        return null;
    }
  } catch (error) {
    return null;
  }
}
