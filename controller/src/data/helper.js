import "dotenv/config";

export function GetShards() {
  return process.env.SHARDS.split(" ");
}

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

export function summarizeObjects(objects) {
  const summarize = {
    structures: [],
    structuresByType: {},
    creeps: [],
    constructionSites: [],
    minerals: [],
    controllers: [],
    spawns: [],
  };

  const objectKeys = Object.keys(objects);
  for (let o = 0; o < objectKeys.length; o += 1) {
    const object = objectKeys[o];
    if (object) {
      if (object.type) {
        if (!summarize.structuresByType[object.type])
          summarize.structuresByType[object.type] = [];
        summarize.structuresByType[object.type].push(object);
      }

      switch (object.type) {
        case "road":
        case "wall":
        case "spawn":
        case "extension":
        case "link":
        case "storage":
        case "tower":
        case "observer":
        case "powerSpawn":
        case "extractor":
        case "lab":
        case "terminal":
        case "container":
        case "nuker":
          summarize.structures.push(object);

          if (object.type === "spawn") summarize.spawns.push(object);
          break;
        case "creep":
          summarize.creeps.push(object);
          break;
        case "constructionSite":
          summarize.constructionSites.push(object);
          break;
        case "mineral":
          summarize.minerals.push(object);
          break;
        case "controller":
          summarize.controllers.push(object);
          break;
        default:
          break;
      }
    }
  }

  return summarize;
}

export function getIntentEffect(action, originalObject) {
  try {
    switch (action) {
      case "harvest":
        return { action, energy: originalObject.body.work * 2 };
      case "build":
        return { action, energy: originalObject.body.work * 5 };
      case "repair":
        if (originalObject.type === "tower") return { action, energy: 10 };
        return { action, energy: originalObject.body.work * 1 };
      case "upgradeController":
        return { action, energy: originalObject.body.work * 1 };
      case "dismantle":
        return { action, energy: originalObject.body.work * 0.25 };
      case "attack":
        if (originalObject.type === "tower")
          return { action, energy: 10, damage: 300 };
        return { action, damage: originalObject.body.attack * 30 };
      case "rangedAttack":
        return {
          action,
          damage: originalObject.body.rangedAttack * 10,
        };
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
