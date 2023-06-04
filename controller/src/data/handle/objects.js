/* eslint-disable no-param-reassign  */

import prepareObject from "../prepare/object.js";
import { findAllByType, groupBy } from "../helper.js";
import {
  CreateAction,
  ActionType,
  ActionListDefaultValuesFiller,
} from "./helper.js";
import GetIntents from "./intentsHelper.js";

export default function handleObjects(username, objects, extras = {}) {
  const currentObjects = extras.currentObjects || {};
  const ticks = extras.ticks || {};

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
  const intents = GetIntents(objects, currentObjects, ticks);

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
    CreateAction("totals.intents", intents.length, ActionType.Divide100)
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
    if (!acc[obj.action]) acc[obj.action] = 0;
    acc[obj.action] += 1;
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
    const intent = intents[c];
    if (intentsCategories.income[intent.action] !== undefined) {
      intentsCategories.income[intent.action] += intent.energy;
    } else if (intentsCategories.outcome[intent.action] !== undefined) {
      intentsCategories.outcome[intent.action] += intent.energy;
    }
    if (intentsCategories.offensive[intent.action] !== undefined) {
      intentsCategories.offensive[intent.action] += intent.damage;
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
    actions.push(
      CreateAction(
        `controller.rclPerTick`,
        controller._upgraded || 0,
        ActionType.FirstTickOnly
      )
    );
  }

  actions = actions.concat(ActionListDefaultValuesFiller(actions));
  return actions;
}
