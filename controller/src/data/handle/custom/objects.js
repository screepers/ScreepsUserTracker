/* eslint-disable no-param-reassign  */

import io from "socket.io-client";
import prepareObject from "../../prepare/object.js";
import { summarizeObjects } from "../../helper.js";
import {
  CreateAction,
  ActionType,
  ActionListDefaultValuesFiller,
} from "../helper.js";
import GetIntents from "../intentsHelper.js";
// import { GetUsernameById } from "../../../rooms/userHelper.js";

const websocket = io(`ws://${process.env.TERMINAL_IP}`, { cookie: false });

export default function handleObjects(username, objects, extras = {}) {
  const originalObjects = extras.originalObjects || {};
  const currentTick = parseInt(extras.tick, 10);

  const objectKeys = Object.keys(objects);
  for (let o = objectKeys.length - 1; o >= 0; o -= 1) {
    const id = objectKeys[o];
    const object = objects[id];
    const originalObject = originalObjects[id];
    if (object && originalObject) {
      prepareObject(object, originalObject);
      if (object.username && object.username !== username) delete objects[id];
    }
  }
  const actions = [];

  // #region FirstTick
  const { isFirstTick } = extras;
  const intents = GetIntents(objects, originalObjects);

  const summarize = summarizeObjects(objects);
  const { structures } = summarize;
  const { structuresByType } = summarize;
  const { controller } = summarize;
  if (isFirstTick) {
    const { creeps } = summarize;
    const { constructionSites } = summarize;
    const { minerals } = summarize;

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
        "totals.minerals",
        minerals.reduce((acc, mineral) => {
          acc += mineral.amount || 0;
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
        CreateAction(
          `resourcesStored.${resource}`,
          resourcesStored[resource],
          ActionType.FirstTickOnly
        )
      );
    });
    minerals.forEach((mineral) => {
      actions.push(
        CreateAction(
          `minerals.${mineral.mineralType}`,
          mineral.mineralAmount,
          ActionType.FirstTickOnly
        )
      );
    });
    // #endregion

    // #region Controller
    if (controller) {
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
      actions.push(CreateAction('controller.rclPerTick', controller._upgraded || 0))
    }

    // #region Spawning
    let storedSpawningEnergy = 0;
    let capacitySpawningEnergy = 0;

    if (structuresByType.spawn) {
      structuresByType.spawn.forEach((spawn) => {
        if (spawn.store) storedSpawningEnergy += spawn.store.energy || 0;
        if (spawn.storeCapacityResource)
          capacitySpawningEnergy += spawn.storeCapacityResource.energy || 0;
      });
    }

    if (structuresByType.extension) {
      structuresByType.extension.forEach((extension) => {
        if (extension.store)
          storedSpawningEnergy += extension.store.energy || 0;
        if (extension.storeCapacityResource)
          capacitySpawningEnergy += extension.storeCapacityResource.energy || 0;
      });
    }
    actions.push(
      CreateAction(
        `spawning.storedSpawningEnergy`,
        storedSpawningEnergy,
        ActionType.FirstTickOnly
      )
    );
    actions.push(
      CreateAction(
        `spawning.capacitySpawningEnergy`,
        capacitySpawningEnergy,
        ActionType.FirstTickOnly
      )
    );
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
        CreateAction(
          `structureHits.${structureKey}`,
          structureHitsByType[structureKey],
          ActionType.FirstTickOnly
        )
      );
    });
  }
  // #endregion

  // #region Terminal storage changes
  const terminals = structuresByType.terminal;
  if (terminals && terminals.length > 0) {
    const terminal = terminals[0];
    // const username = GetUsernameById();
    websocket.emit(
      "terminal",
      JSON.stringify({
        terminalStore: terminal.store,
        tick: currentTick,
        username,
        shard: extras.shard,
        room: terminal.room,
      })
    );
  }
  // #endregion

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
    CreateAction(
      `spawning.spawnUptimePercentage`,
      spawnDuration > 0 ? Math.round(spawnDuration / spawnCount) : 0,
      ActionType.Divide100
    )
  );
  // #endregion
  // #endregion

  actions.push(
    CreateAction("totals.intents", intents.length, ActionType.Divide100)
  );

  return ActionListDefaultValuesFiller(actions, extras.type, isFirstTick);
}
