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
export function findOriginalObject(id, firstTickObjects) {
  const object = Object.values(firstTickObjects).find((o) => o && o._id === id);
  if (object) {
    return object;
  }
  return null;
}

export function findAllByType(objects, type) {
  let possibleTypes = [type];
  if (type === "structure") possibleTypes = STRUCTURE_TYPES;
  const list = Object.values(objects).filter(
    (o) => o && o.type && possibleTypes.includes(o.type)
  );
  return list;
}

export function findAllIntents(objects) {
  const list = Object.values(objects).filter((o) => o && o._actionLog);
  return list;
}

export function groupBy(obj, key) {
  const result = {};
  obj.forEach((o) => {
    if (!result[key]) result[key] = [];
    result[key].push(o);
  });
  return result;
}

export function getIntentEffect(action, originalObject) {
  switch (action) {
    case "harvest":
      return { energy: originalObject.body.work * 2 };
    case "build":
      return { energy: originalObject.body.work * 5 };
    case "repair":
      if (originalObject.type === "tower") {
        return { energy: 10 };
      }
      else if (!originalObject.body) return 0;
      
      return { energy: originalObject.body.work * 1 };
    case "upgradeController":
      return { energy: originalObject.body.work * 1 };
    case "dismantle":
      return { energy: originalObject.body.work * 0.25 };
    case "attack":
      if (originalObject.type === "tower") {
        return { energy: 10, damage: 300 };
      }
      return { damage: originalObject.body.attack * 30 };
    case "rangedAttack":
      return { damage: originalObject.body.rangedAttack * 10 };
    case "rangedMassAttack":
      return { damage: originalObject.body.rangedAttack * 4 };
    case "heal":
      if (originalObject.type === "tower") {
        return { energy: 10, damage: 200 };
      }
      return { damage: originalObject.body.heal * 12 };
    case "rangedHeal":
      return { damage: originalObject.body.heal * 4 };
    default:
      return 0;
  }
}
