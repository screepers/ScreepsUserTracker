import modifyObject from "../modify/object.js";
import prepareObject from "../prepare/object.js";
import {
  findOriginalObject,
  findAllByType,
  groupBy,
  findAllIntents,
  getIntentEffect
} from "../helper.js";
import { CreateAction, ActionType } from "./helper.js";

export default function handleObjects(
  objects,
  previousObjects = {},
  firstTickObjects = {}
) {
  const objectKeys = Object.keys(objects);
  for (let o = 0; o < objectKeys.length; o++) {
    const object = objects[objectKeys[o]];
    if (object === null) continue;

    prepareObject(object);
    modifyObject(object);
  }

  const creeps = findAllByType(objects, "creep");
  const structures = findAllByType(objects, "structure");
  const constructionSites = findAllByType(objects, "constructionSite");
  const intents = findAllIntents(objects);

  const actions = []
  actions.push(CreateAction("totals.creeps", creeps.length, ActionType.FirstTickOnly))
  actions.push(CreateAction("totals.structures", structures.length, ActionType.FirstTickOnly))
  actions.push(CreateAction("totals.constructionSites", constructionSites.length, ActionType.FirstTickOnly))
  actions.push(CreateAction("totals.resourcesStored", structures.reduce((acc, structure) => {
    if (structure.store) {
      Object.values(structure.store).forEach((amount) => {
        acc += amount;
      });
    }
    return acc;
  }, 0)
    , ActionType.FirstTickOnly))
  actions.push(CreateAction("totals.intents", intents.reduce((acc, creep) => {
    const amount = Object.keys(creep._actionLog || []).length
    acc += amount;
    return acc;
  }, 0), ActionType.FirstTickOnly))


  const creepPartsByType = creeps.reduce((acc, creep) => {
    Object.entries(creep.body).forEach(([part, count]) => {
      if (!acc[part]) acc[part] = 0;
      acc[part] += count;
    });
    return acc;
  }, {})
  const creepPartsByTypeKeys = Object.keys(creepPartsByType)
  creepPartsByTypeKeys.forEach((part) => {
    actions.push(CreateAction(`countByType.creepParts.${part}`, creepPartsByType[part], ActionType.FirstTickOnly))
  })

  const structuresByType = groupBy(structures, "type")
  const structuresByTypeKeys = Object.keys(structuresByType)
  structuresByTypeKeys.forEach((type) => {
    actions.push(CreateAction(`countByType.structures.${type}`, structuresByType[type].length, ActionType.FirstTickOnly))
  })

  const constructionSitesByType = groupBy(constructionSites, "structureType")
  const constructionSitesByTypeKeys = Object.keys(constructionSitesByType)
  constructionSitesByTypeKeys.forEach((type) => {
    actions.push(CreateAction(`countByType.constructionSites.${type}`, constructionSitesByType[type].length, ActionType.FirstTickOnly))
  })

  const intentsByType = creeps.reduce((acc, creep) => {
    const actionLogKeys = Object.keys(creep._actionLog || [])
    actionLogKeys.forEach((action) => {
      const count = creep._actionLog[action].length
      if (!acc[action]) acc[action] = 0;
      acc[action] += count;
    })
    return acc;
  }, {})
  const intentsByTypeKeys = Object.keys(intentsByType)
  intentsByTypeKeys.forEach((type) => {
    actions.push(CreateAction(`countByType.intents.${type}`, intentsByType[type], ActionType.Divide100))
  })

  actions.push(CreateAction(`constructionSiteProgressPercentage`, constructionSites.length > 0 ?
    constructionSites.reduce((acc, site) => {
      acc += site.progress / site.progressTotal;
      return acc;
    }, 0) / constructionSites.length : -1, ActionType.FirstTickOnly))

  const resourcesStored = structures.reduce((acc, structure) => {
    if (structure.store) {
      Object.entries(structure.store).forEach(([resource, amount]) => {
        if (!acc[resource]) acc[resource] = 0;
        acc[resource] += amount;
      });
    }
    return acc;
  }, {})
  const resourcesStoredKeys = Object.keys(resourcesStored)
  resourcesStoredKeys.forEach((resource) => {
    actions.push(CreateAction(`resourcesStored.${resource}`, resourcesStored[resource], ActionType.FirstTickOnly))
  })

  const intentsCategories = {
    income: {
      harvest: 0,
      dismantle: 0,
    },
    outcome: {
      repair: 0,
      build: 0,
      upgradeController: 0,
    },
    offensive: {
      attack: 0,
      rangedAttack: 0,
      rangedMassAttack: 0,
      heal: 0,
      rangedHeal: 0,
    },
  };
  for (let c = 0; c < intents.length; c++) {
    const creep = intents[c];

    const firstTickObject = findOriginalObject(creep._id, firstTickObjects);
    if (!firstTickObject) continue;
    Object.keys(creep._actionLog || []).forEach((action) => {
      const intentEffect = getIntentEffect(action, firstTickObject);
      if (intentEffect) {
        if (intentsCategories.income[action]) {
          intentsCategories.income[action] += intentEffect.energy;
        }
        else if (intentsCategories.outcome[action]) {
          intentsCategories.outcome[action] += intentEffect.energy;
        }
        if (intentsCategories.offensive[action]) {
          intentsCategories.offensive[action] += intentEffect.damage;
        }
      }
    });
  }

  const intentsCategoriesKeys = Object.keys(intentsCategories)
  intentsCategoriesKeys.forEach((category) => {
    const intentsCategory = intentsCategories[category]
    const intentsCategoryKeys = Object.keys(intentsCategory)
    intentsCategoryKeys.forEach((intent) => {
      actions.push(CreateAction(`intents.${category}.${intent}`, intentsCategory[intent], ActionType.Divide100))
    })
  })


  const hitsObjects = Object.values(objects).filter((o) => o && o.hits);
  const previousHitsObjects = Object.values(previousObjects).filter(
    (o) => o && o.hits
  );

  let hitsGained = 0;
  let hitsLost = 0;
  for (let h = 0; h < hitsObjects.length; h++) {
    const object = hitsObjects[h];
    const previousObject = findOriginalObject(object._id, previousHitsObjects);
    if (!previousObject) continue;
    if (object.hits > previousObject.hits) {
      hitsGained += object.hits - previousObject.hits;
    } else if (object.hits < previousObject.hits) {
      hitsLost += previousObject.hits - object.hits;
    }
  }

  actions.push(CreateAction(`structureHits.gained`, hitsGained, ActionType.FirstTickOnly))
  actions.push(CreateAction(`structureHits.lost`, hitsLost, ActionType.FirstTickOnly))
  return actions;
}
