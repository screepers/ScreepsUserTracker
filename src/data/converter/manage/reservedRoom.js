import prepareObject from "../prepare/object.js";
import { summarizeObjects } from "../helper.js";
import ActionProcessor from "../../broker/defaultActions.js"
import GetIntents from "../intentsHelper.js";

export default async function handleObjects(username, objects, extras = {}) {
  const originalObjects = extras.originalObjects || {};

  const objectKeys = Object.keys(objects);
  for (let o = objectKeys.length - 1; o >= 0; o -= 1) {
    const id = objectKeys[o];
    const object = objects[id];
    const originalObject = originalObjects[id];
    if (object && originalObject) {
      await prepareObject(object, originalObject);
      if (object.username && object.username !== username) delete objects[id];
    }
  }

  let actions = [];
  const { isFirstTick } = extras;
  const intents = GetIntents(objects, originalObjects);

  if (isFirstTick) {
    const summarize = summarizeObjects(objects);
    const { creeps } = summarize;
    const { structures } = summarize;
    const { constructionSites } = summarize;

    // #region Totals
    actions.push(
      ActionProcessor.CreateAction("totals.creeps", creeps.length, ActionProcessor.ActionType.FirstTickOnly)
    );
    actions.push(
      ActionProcessor.CreateAction(
        "totals.structures",
        structures.length,
        ActionProcessor.ActionType.FirstTickOnly
      )
    );
    actions.push(
      ActionProcessor.CreateAction(
        "totals.constructionSites",
        constructionSites.length,
        ActionProcessor.ActionType.FirstTickOnly
      )
    );
    actions.push(
      ActionProcessor.CreateAction(
        "totals.resourcesStored",
        structures.reduce((acc, structure) => {
          if (structure.store) {
            Object.values(structure.store).forEach((amount) => {
              acc += amount;
            });
          }
          return acc;
        }, 0),
        ActionProcessor.ActionType.FirstTickOnly
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
        ActionProcessor.CreateAction(
          `countByType.creepParts.${part}`,
          creepPartsByType[part],
          ActionProcessor.ActionType.FirstTickOnly
        )
      );
    });

    const { structuresByType } = summarize;
    const structuresByTypeKeys = Object.keys(structuresByType);
    structuresByTypeKeys.forEach((type) => {
      actions.push(
        ActionProcessor.CreateAction(
          `countByType.structures.${type}`,
          structuresByType[type].length,
          ActionProcessor.ActionType.FirstTickOnly
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
        ActionProcessor.CreateAction(
          `countByType.constructionSites.${type}`,
          constructionSitesByType[type].length,
          ActionProcessor.ActionType.FirstTickOnly
        )
      );
    });
    // #endregion

    // #region Construction
    actions.push(
      ActionProcessor.CreateAction(
        `constructionSites.progressPercentage`,
        constructionSites.length > 0
          ? constructionSites.reduce((acc, site) => {
            acc += site.progress / site.progressTotal;
            return acc;
          }, 0) / constructionSites.length
          : 0,
        ActionProcessor.ActionType.FirstTickOnly
      )
    );
    actions.push(
      ActionProcessor.CreateAction(
        `constructionSites.count`,
        constructionSites.length,
        ActionProcessor.ActionType.FirstTickOnly
      )
    );
    // #endregion

    // #region ResourcesStored & Minerals
    const resourcesStored = structures.reduce((acc, structure) => {
      if (
        structure.store &&
        ["storage", "link", "container", "terminal"].includes(structure.type)
      ) {
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
        ActionProcessor.CreateAction(
          `resourcesStored.${resource}`,
          resourcesStored[resource],
          ActionProcessor.ActionType.FirstTickOnly
        )
      );
    });
    // #endregion

    // #region StructureHits
    const structureHitsByType = {};
    structuresByTypeKeys.forEach((structureKey) => {
      if (structureKey !== "controller") {
        const strs = structuresByType[structureKey];
        const hitsTotal = strs.reduce((acc, structure) => {
          acc += structure.hits || 0;
          return acc;
        }, 0);

        structureHitsByType[structureKey] = hitsTotal / strs.length;
      }
    });

    const structureHitsByTypeKeys = Object.keys(structureHitsByType);
    structureHitsByTypeKeys.forEach((structureKey) => {
      actions.push(
        ActionProcessor.CreateAction(
          `structureHits.${structureKey}`,
          structureHitsByType[structureKey],
          ActionProcessor.ActionType.FirstTickOnly
        )
      );
    });
  }
  // #endregion

  // #endregion

  // #region Divide100

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
        ActionProcessor.CreateAction(
          `intents.${category}.${intent}`,
          intentsCategory[intent],
          ActionProcessor.ActionType.Divide100
        )
      );
    });
  });

  const intentsByType = intents.reduce((acc, obj) => {
    if (!acc[obj.action]) acc[obj.action] = 0;
    acc[obj.action] += 1;
    return acc;
  }, {});
  const intentsByTypeKeys = Object.keys(intentsByType);
  intentsByTypeKeys.forEach((type) => {
    actions.push(
      ActionProcessor.CreateAction(
        `countByType.intents.${type}`,
        intentsByType[type],
        ActionProcessor.ActionType.Divide100
      )
    );
  });
  // #endregion
  // #endregion

  actions.push(
    ActionProcessor.CreateAction("totals.intents", intents.length, ActionProcessor.ActionType.Divide100)
  );

  actions = ActionProcessor.ActionListDefaultValuesFiller(actions, extras.type, isFirstTick);
  return actions;
}
