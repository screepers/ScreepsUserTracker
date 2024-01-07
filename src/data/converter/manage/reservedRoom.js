import ActionProcessor from "../../broker/defaultActions.js"

export default async function handleObjects(data, opts) {
  const { summarize, intents } = data;

  let actions = [];
  const { isFirstTick } = opts;

  if (isFirstTick) {
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

  // #region Totals
  actions.push(
    ActionProcessor.CreateAction("totals.intents", intents.length, ActionProcessor.ActionType.Divide100)
  );
  // #endregion

  // #endregion

  actions = ActionProcessor.ActionListDefaultValuesFiller(actions, opts.type, isFirstTick);
  return actions;
}
