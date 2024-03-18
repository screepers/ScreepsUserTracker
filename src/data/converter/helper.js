const structureTypes = ['road',
  'constructedWall',
  'rampart',
  'spawn',
  'extension',
  'link',
  'storage',
  'tower',
  'observer',
  'powerSpawn',
  'extractor',
  'lab',
  'terminal',
  'container',
  'nuker',
]

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
    controller: undefined,
    spawns: [],
    intents: [],
  };

  for (let t = 0; t < structureTypes.length; t += 1) {
    const type = structureTypes[t];
    summarize.structuresByType[type] = [];
  }

  const objectValues = Object.values(objects);
  for (let o = 0; o < objectValues.length; o += 1) {
    const object = objectValues[o];
    if (object) {
      switch (object.type) {
        case "road":
        case "rampart":
        case "constructedWall":
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
          summarize.structuresByType[object.type].push(object);
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
          summarize.controller = object;
          break;
        default:
          break;
      }
      if (object.cachedIntentsEffect && object.cachedIntentsEffect.length > 0) {
        summarize.intents = summarize.intents.concat(object.cachedIntentsEffect)
      }
    }
  }

  return summarize;
}

export function getIntentEffect(action, originalObject) {
  try {
    switch (action) {
      case "harvest": {
        const usableParts = Math.max(Math.floor(originalObject.store.energy / 2), originalObject.groupedBody.work);
        return {
          action,
          energy: usableParts * 2,
          effect: (originalObject.groupedBodyEffect.harvest / originalObject.groupedBody.work) * usableParts
        };
      }
      case "build": {
        const usableParts = Math.max(Math.floor(originalObject.store.energy / 5), originalObject.groupedBody.work);
        return {
          action,
          energy: usableParts * 5,
          effect: (originalObject.groupedBodyEffect.build / originalObject.groupedBody.work) * usableParts
        };
      }
      case "repair": {
        if (originalObject.type === "tower") return { action, energy: 10 };
        const usableParts = Math.max(originalObject.store.energy, originalObject.groupedBody.work);
        return {
          action,
          energy: usableParts * 1,
          effect: (originalObject.groupedBodyEffect.repair / originalObject.groupedBody.work) * usableParts
        };
      }
      case "upgradeController": {
        const usableParts = Math.max(originalObject.store.energy, originalObject.groupedBody.work);
        return {
          action,
          energy: usableParts * 1,
          effect: (originalObject.groupedBodyEffect.upgradeController / originalObject.groupedBody.work) * usableParts
        };
      }
      case "dismantle": {
        const usableParts = originalObject.groupedBody.work;
        return {
          action,
          energy: originalObject.groupedBody.work * 0.25,
          effect: (originalObject.groupedBodyEffect.dismantle / originalObject.groupedBody.work) * usableParts
        };
      }
      case "attack":
        if (originalObject.type === "tower")
          return { action, energy: 10, damage: 300 };
        return {
          action,
          damage: originalObject.groupedBody.attack * 30,
          effect: originalObject.groupedBodyEffect.attack
        };
      case "rangedAttack":
        return {
          action,
          damage: originalObject.groupedBody.ranged_attack * 10,
          effect: originalObject.groupedBodyEffect.rangedAttack
        };
      case "rangedMassAttack":
        return {
          action,
          damage: originalObject.groupedBody.ranged_attack * 4,
          effect: originalObject.groupedBodyEffect.rangedMassAttack
        };
      case "heal":
        if (originalObject.type === "tower") {
          return { action, energy: 10, damage: 200 };
        }
        return {
          action,
          damage: originalObject.groupedBody.heal * 12,
          effect: originalObject.groupedBodyEffect.heal
        };
      case "rangedHeal":
        return {
          action,
          damage: originalObject.groupedBody.heal * 4,
          effect: originalObject.groupedBodyEffect.rangedHeal
        };
      case "move":
        return { action };
      default:
        return null;
    }
  } catch (error) {
    return null;
  }
}
