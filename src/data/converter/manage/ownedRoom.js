/* eslint-disable no-param-reassign  */

import { cleanSource } from "../../../helper/index.js";
import ActionProcessor from "../../broker/defaultActions.js"

export default async function handleObjects(data, opts) {
  const { summarize } = data;
  const { intents } = summarize

  let actions = [];

  // #region FirstTick
  const { isFirstTick, currentTick } = opts;

  const { structures } = summarize;
  const { structuresByType } = summarize;
  const { controller } = summarize;
  if (isFirstTick) {
    const { creeps } = summarize;
    const { constructionSites } = summarize;
    const { minerals } = summarize;

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
    let totalResourcesStored = structures.reduce((acc, structure) => {
      if (structure.store) {
        Object.values(structure.store).forEach((amount) => {
          acc += amount;
        });
      }
      return acc;
    }, 0)
    totalResourcesStored += creeps.reduce((acc, creep) => {
      if (creep.store) {
        Object.values(creep.store).forEach((amount) => {
          acc += amount;
        });
      }
      return acc;
    }, 0)
    actions.push(
      ActionProcessor.CreateAction(
        "totals.resourcesStored",
        totalResourcesStored,
        ActionProcessor.ActionType.FirstTickOnly
      )
    );
    actions.push(
      ActionProcessor.CreateAction(
        "totals.minerals",
        minerals.reduce((acc, mineral) => {
          acc += mineral.amount || 0;
          return acc;
        }, 0),
        ActionProcessor.ActionType.FirstTickOnly
      )
    );
    // #endregion

    // #region CountByType
    const creepPartsByType = creeps.reduce((acc, creep) => {
      Object.entries(creep.groupedBody || {}).forEach(([part, count]) => {
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
    for (let cst = 0; cst < constructionSitesByTypeKeys.length; cst += 1) {
      const type = constructionSitesByTypeKeys[cst];
      actions.push(
        ActionProcessor.CreateAction(
          `countByType.constructionSites.${type}`,
          constructionSitesByType[type],
          ActionProcessor.ActionType.FirstTickOnly
        )
      );
    }
    // #endregion

    // #region Construction
    actions.push(
      ActionProcessor.CreateAction(
        `constructionSites.progressPercentage`,
        constructionSites.length > 0
          ? Math.round(constructionSites.reduce((acc, site) => {
            acc += site.progress / site.progressTotal;
            return acc;
          }, 0) / constructionSites.length * 100) / 100
          : 0,
        ActionProcessor.ActionType.FirstTickOnly
      )
    );
    actions.push(
      ActionProcessor.CreateAction(
        `constructionSites.progressNeeded`,
        constructionSites.reduce((acc, site) => {
          acc += site.progressTotal - site.progress;
          return acc;
        }, 0),
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
    minerals.forEach((mineral) => {
      actions.push(
        ActionProcessor.CreateAction(
          `minerals.${mineral.mineralType}`,
          mineral.mineralAmount,
          ActionProcessor.ActionType.FirstTickOnly
        )
      );
    });
    // #endregion

    // #region Controller
    if (controller) {
      actions.push(
        ActionProcessor.CreateAction(
          `controller.level`,
          controller.level,
          ActionProcessor.ActionType.FirstTickOnly
        )
      );

      const combinedRCLByLevel = [0, 0, 200, 45200, 180200, 585200, 1800200, 5445200, 16380200];
      if (controller.level < 8) {
        actions.push(
          ActionProcessor.CreateAction(
            `controller.progress`,
            controller.progress,
            ActionProcessor.ActionType.FirstTickOnly
          )
        );
        actions.push(
          ActionProcessor.CreateAction(
            `controller.progressTotal`,
            controller.progressTotal,
            ActionProcessor.ActionType.FirstTickOnly
          )
        );
      }

      actions.push(
        ActionProcessor.CreateAction(
          `controller.progressCombined`,
          combinedRCLByLevel[controller.level] + (controller.level < 8 ? controller.progress : 0),
          ActionProcessor.ActionType.FirstTickOnly
        )
      );
      actions.push(
        ActionProcessor.CreateAction(
          `controller.ticksToDowngrade`,
          controller.ticksToDowngrade || -1,
          ActionProcessor.ActionType.FirstTickOnly
        )
      );
      actions.push(
        ActionProcessor.CreateAction(
          `controller.safeModeAvailable`,
          controller.safeModeAvailable,
          ActionProcessor.ActionType.FirstTickOnly
        )
      );
    }
    // #endregion

    // #region Spawning
    let storedSpawningEnergy = 0;
    let capacitySpawningEnergy = 0;

    for (let s = 0; s < structuresByType.spawn.length; s += 1) {
      const spawn = structuresByType.spawn[s];
      if (spawn.store) storedSpawningEnergy += spawn.store.energy || 0;
      if (spawn.storeCapacityResource)
        capacitySpawningEnergy += spawn.storeCapacityResource.energy || 0;
    };

    for (let s = 0; s < structuresByType.extension.length; s += 1) {
      const extension = structuresByType.extension[s];
      if (extension.store)
        storedSpawningEnergy += extension.store.energy || 0;
      if (extension.storeCapacityResource)
        capacitySpawningEnergy += extension.storeCapacityResource.energy || 0;
    };
    actions.push(
      ActionProcessor.CreateAction(
        `spawning.storedSpawningEnergy`,
        storedSpawningEnergy,
        ActionProcessor.ActionType.FirstTickOnly
      )
    );
    actions.push(
      ActionProcessor.CreateAction(
        `spawning.capacitySpawningEnergy`,
        capacitySpawningEnergy,
        ActionProcessor.ActionType.FirstTickOnly
      )
    );
    // #endregion

    // #region StructureHits
    const structureHitsByType = {};
    structuresByTypeKeys.forEach((structureKey) => {
      const strs = structuresByType[structureKey];
      const hitsTotal = strs.reduce((acc, structure) => {
        acc += structure.hits || 0;
        return acc;
      }, 0);

      structureHitsByType[structureKey] = hitsTotal / strs.length;
    });

    const structureHitsByTypeKeys = Object.keys(structureHitsByType);
    structureHitsByTypeKeys.forEach((structureKey) => {
      actions.push(
        ActionProcessor.CreateAction(
          `structureHits.${structureKey}`,
          structureHitsByType[structureKey] || 0,
          ActionProcessor.ActionType.FirstTickOnly
        )
      );
    });

    actions.push(
      ActionProcessor.CreateAction("totals.rooms.owned", 1, ActionProcessor.ActionType.FirstTickOnly)
    );
  }
  // #endregion

  // #endregion

  // #region IntentsCategories
  const base = {
    cost: 0,
    effect: 0
  }
  const intentsCategories = {
    income: {
      harvest: cleanSource(base),
      dismantle: cleanSource(base),
    },
    outcome: {
      repair: cleanSource(base),
      build: cleanSource(base),
      upgradeController: cleanSource(base),
    },
    offensive: {
      attack: cleanSource(base),
      rangedAttack: cleanSource(base),
      rangedMassAttack: cleanSource(base),
      heal: cleanSource(base),
      rangedHeal: cleanSource(base),
    },
  };
  for (let c = 0; c < intents.length; c += 1) {
    const intent = intents[c];
    if (intentsCategories.income[intent.action] !== undefined) {
      intentsCategories.income[intent.action].effect += intent.effect;
      intentsCategories.income[intent.action].cost += intent.energy;
    } else if (intentsCategories.outcome[intent.action] !== undefined) {
      intentsCategories.outcome[intent.action].effect += intent.effect;
      intentsCategories.outcome[intent.action].cost += intent.energy;
    }
    if (intentsCategories.offensive[intent.action] !== undefined) {
      intentsCategories.offensive[intent.action].effect += intent.effect;
    }
  }

  actions.push(ActionProcessor.CreateAction('controller.gclPerTick',
    intentsCategories.outcome.upgradeController.effect,
    ActionProcessor.ActionType.Divide100))
  if (controller && controller.level < 8) {
    actions.push(ActionProcessor.CreateAction('controller.rclPerTick',
      intentsCategories.outcome.upgradeController.effect,
      ActionProcessor.ActionType.Divide100))
  }

  const intentsCategoriesKeys = Object.keys(intentsCategories);
  intentsCategoriesKeys.forEach((category) => {
    const intentsCategory = intentsCategories[category];
    const intentsCategoryKeys = Object.keys(intentsCategory);
    intentsCategoryKeys.forEach((intent) => {
      actions.push(
        ActionProcessor.CreateAction(
          `intents.${category}.${intent}.cost`,
          intentsCategory[intent].cost,
          ActionProcessor.ActionType.Divide100
        )
      );
      actions.push(
        ActionProcessor.CreateAction(
          `intents.${category}.${intent}.effect`,
          intentsCategory[intent].effect,
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

  // #region Spawn
  const spawns = summarize.structuresByType.spawn;
  const spawnCount = spawns.length;
  let spawnDuration = 0;
  for (let s = 0; s < spawns.length; s += 1) {
    const spawn = spawns[s];
    const maxSpawnTime = Math.floor(currentTick / 100) * 100 + 100;
    if (spawn.spawning)
      spawnDuration +=
        Math.min(spawn.spawning.spawnTime, maxSpawnTime) - currentTick;
  };
  actions.push(
    ActionProcessor.CreateAction(
      `spawning.spawnUptimePercentage`,
      spawnDuration > 0 ? Math.round(spawnDuration / spawnCount) : 0,
      ActionProcessor.ActionType.Divide100
    )
  );
  // #endregion

  // #region Totals
  actions.push(
    ActionProcessor.CreateAction("totals.intents", intents.length, ActionProcessor.ActionType.Divide100)
  );
  // #endregion

  // #endregion

  actions = ActionProcessor.ActionListDefaultValuesFiller(actions, opts.type, isFirstTick);
  return actions;
}
