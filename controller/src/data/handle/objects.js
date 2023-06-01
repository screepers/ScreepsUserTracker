/* eslint-disable no-param-reassign  */

import prepareObject from "../prepare/object.js";
import {
  findOriginalObject,
  findAllByType,
  groupBy,
  findAllIntents,
  getIntentEffect,
} from "../helper.js";
import {
  CreateAction,
  ActionType,
  ActionListDefaultValuesFiller,
} from "./helper.js";

export default function handleObjects(
  username,
  objects,
  previousObjects,
  firstTickObjects
) {
  if (!previousObjects) previousObjects = {};
  if (!firstTickObjects) firstTickObjects = {};

  const objectKeys = Object.keys(objects);
  for (let o = objectKeys.length - 1; o >= 0; o -= 1) {
    const object = objects[objectKeys[o]];
    if (object) {
      prepareObject(object);
      if (object.username && object.username !== username)
        delete objects[objectKeys[o]];
    }
  }

  const creeps = findAllByType(objects, "creep");
  const structures = findAllByType(objects, "structure");
  const constructionSites = findAllByType(objects, "constructionSite");
  const intents = findAllIntents(objects);

  let actions = [];

  // #region Totals
  actions.push(
    CreateAction("totals.creeps", creeps.length, ActionType.FirstTickOnly)
  );
  actions.push(
    CreateAction(
      "totals.structures",
      structures.length,
      ActionType.FirstTickOnly
    )
  );
  actions.push(
    CreateAction(
      "totals.constructionSites",
      constructionSites.length,
      ActionType.FirstTickOnly
    )
  );
  actions.push(
    CreateAction(
      "totals.resourcesStored",
      structures.reduce((acc, structure) => {
        if (structure.store) {
          Object.values(structure.store).forEach((amount) => {
            acc += amount;
          });
        }
        return acc;
      }, 0),
      ActionType.FirstTickOnly
    )
  );
  actions.push(
    CreateAction(
      "totals.intents",
      intents.reduce((acc, creep) => {
        const amount = Object.keys(creep._actionLog || []).length;
        acc += amount;
        return acc;
      }, 0),
      ActionType.FirstTickOnly
    )
  );
  // #endregion

  // #region CountByType
  const creepPartsByType = creeps.reduce((acc, creep) => {
    Object.entries(creep.body).forEach(([part, count]) => {
      if (!acc[part]) acc[part] = 0;
      acc[part] += count;
    });
    return acc;
  }, {});
  const creepPartsByTypeKeys = Object.keys(creepPartsByType);
  creepPartsByTypeKeys.forEach((part) => {
    actions.push(
      CreateAction(
        `countByType.creepParts.${part}`,
        creepPartsByType[part],
        ActionType.FirstTickOnly
      )
    );
  });

  const structuresByType = groupBy(structures, "type");
  const structuresByTypeKeys = Object.keys(structuresByType);
  structuresByTypeKeys.forEach((type) => {
    actions.push(
      CreateAction(
        `countByType.structures.${type}`,
        structuresByType[type].length,
        ActionType.FirstTickOnly
      )
    );
  });

  const constructionSitesByType = constructionSites.reduce((acc, obj) => {
    if (!acc[obj.structureType]) acc[obj.structureType] = 0;
    acc[obj.structureType] += 1;
    return acc;
  }, {});
  const constructionSitesByTypeKeys = Object.keys(constructionSitesByType);
  constructionSitesByTypeKeys.forEach((type) => {
    actions.push(
      CreateAction(
        `countByType.constructionSites.${type}`,
        constructionSitesByType[type].length,
        ActionType.FirstTickOnly
      )
    );
  });

  const intentsByType = intents.reduce((acc, obj) => {
    const actionLogKeys = Object.keys(obj._actionLog || []);
    actionLogKeys.forEach((action) => {
      if (!acc[action]) acc[action] = 0;
      acc[action] += 1;
    });
    return acc;
  }, {});
  const intentsByTypeKeys = Object.keys(intentsByType);
  intentsByTypeKeys.forEach((type) => {
    actions.push(
      CreateAction(
        `countByType.intents.${type}`,
        intentsByType[type],
        ActionType.Divide100
      )
    );
  });
  // #endregion

  // #region Construction
  actions.push(
    CreateAction(
      `constructionSites.progressPercentage`,
      constructionSites.length > 0
        ? constructionSites.reduce((acc, site) => {
            acc += site.progress / site.progressTotal;
            return acc;
          }, 0) / constructionSites.length
        : 0,
      ActionType.FirstTickOnly
    )
  );
  actions.push(
    CreateAction(
      `constructionSites.count`,
      constructionSites.length,
      ActionType.FirstTickOnly
    )
  );
  // #endregion

  // #region ResourcesStored
  const resourcesStored = structures.reduce((acc, structure) => {
    if (structure.store) {
      Object.entries(structure.store).forEach(([resource, amount]) => {
        if (!acc[resource]) acc[resource] = 0;
        acc[resource] += amount;
      });
    }
    return acc;
  }, {});
  const resourcesStoredKeys = Object.keys(resourcesStored);
  resourcesStoredKeys.forEach((resource) => {
    actions.push(
      CreateAction(
        `resourcesStored.${resource}`,
        resourcesStored[resource],
        ActionType.FirstTickOnly
      )
    );
  });
  // #endregion

  // #region IntentsCategories
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
  for (let c = 0; c < intents.length; c += 1) {
    const obj = intents[c];

    const firstTickObject = findOriginalObject(obj._id, firstTickObjects);
    if (firstTickObject) {
      Object.keys(obj._actionLog || []).forEach((action) => {
        const intentEffect = getIntentEffect(action, firstTickObject);
        if (intentEffect) {
          if (intentsCategories.income[action] !== undefined) {
            intentsCategories.income[action] += intentEffect.energy;
          } else if (intentsCategories.outcome[action] !== undefined) {
            intentsCategories.outcome[action] += intentEffect.energy;
          }
          if (intentsCategories.offensive[action] !== undefined) {
            intentsCategories.offensive[action] += intentEffect.damage;
          }
        }
      });
    }
  }

  const intentsCategoriesKeys = Object.keys(intentsCategories);
  intentsCategoriesKeys.forEach((category) => {
    const intentsCategory = intentsCategories[category];
    const intentsCategoryKeys = Object.keys(intentsCategory);
    intentsCategoryKeys.forEach((intent) => {
      actions.push(
        CreateAction(
          `intents.${category}.${intent}`,
          intentsCategory[intent],
          ActionType.Divide100
        )
      );
    });
  });
  // #endregion

  // #region Hits
  const hitsObjects = Object.values(objects).filter((o) => o && o.hits);
  const previousHitsObjects = Object.values(previousObjects).filter(
    (o) => o && o.hits
  );

  let hitsGained = 0;
  let hitsLost = 0;
  for (let h = 0; h < hitsObjects.length; h += 1) {
    const object = hitsObjects[h];
    const previousObject = findOriginalObject(object._id, previousHitsObjects);
    if (previousObject) {
      if (object.hits > previousObject.hits) {
        hitsGained += object.hits - previousObject.hits;
      } else if (object.hits < previousObject.hits) {
        hitsLost += previousObject.hits - object.hits;
      }
    }
  }

  actions.push(
    CreateAction(`structureHits.gained`, hitsGained, ActionType.FirstTickOnly)
  );
  actions.push(
    CreateAction(`structureHits.lost`, hitsLost, ActionType.FirstTickOnly)
  );
  // #endregion

  // #region Controller
  const controllers = structuresByType.controller;
  if (controllers && controllers.length > 0) {
    const controller = controllers[0];
    actions.push(
      CreateAction(
        `controller.level`,
        controller.level,
        ActionType.FirstTickOnly
      )
    );

    if (controller.level < 8) {
      actions.push(
        CreateAction(
          `controller.progress`,
          controller.progress,
          ActionType.FirstTickOnly
        )
      );
      actions.push(
        CreateAction(
          `controller.progressTotal`,
          controller.progressTotal,
          ActionType.FirstTickOnly
        )
      );
    }

    actions.push(
      CreateAction(
        `controller.ticksToDowngrade`,
        controller.ticksToDowngrade || -1,
        ActionType.FirstTickOnly
      )
    );
    actions.push(
      CreateAction(
        `controller.safeModeAvailable`,
        controller.safeModeAvailable,
        ActionType.FirstTickOnly
      )
    );
  }

  actions = actions.concat(ActionListDefaultValuesFiller(actions));
  return actions;
}
