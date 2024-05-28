import { getIntentEffect } from "../helper.js";

function getBodyBoostEffect(groupedBodyEffect, part) {
  switch (part.type) {
    case "work":
      if (!groupedBodyEffect.harvest) groupedBodyEffect.harvest = 0;
      if (!groupedBodyEffect.build) groupedBodyEffect.build = 0;
      if (!groupedBodyEffect.repair) groupedBodyEffect.repair = 0;
      if (!groupedBodyEffect.upgradeController) groupedBodyEffect.upgradeController = 0;
      if (!groupedBodyEffect.dismantle) groupedBodyEffect.dismantle = 0;

      switch (part.boost) {
        case "UO":
          groupedBodyEffect.harvest += 2 * 3
          break;
        case "UHO2":
          groupedBodyEffect.harvest += 2 * 5
          break;
        case "XUHO2":
          groupedBodyEffect.harvest += 2 * 7
          break;
        default:
          groupedBodyEffect.harvest += 2 * 1
          break;
      }
      switch (part.boost) {
        case "LH":
          groupedBodyEffect.build += 5 * 1.5
          groupedBodyEffect.repair += 1 * 1.5
          break;
        case "LH2O":
          groupedBodyEffect.build += 5 * 1.8
          groupedBodyEffect.repair += 1 * 1.8
          break;
        case "XLH2O":
          groupedBodyEffect.build += 5 * 2
          groupedBodyEffect.repair += 1 * 2
          break;
        default:
          groupedBodyEffect.build += 5 * 1
          groupedBodyEffect.repair += 1 * 1
          break;
      }

      switch (part.boost) {
        case "GH":
          groupedBodyEffect.dismantle += 0.25 * 2
          break;
        case "GH2O":
          groupedBodyEffect.dismantle += 0.25 * 3
          break;
        case "XGH2O":
          groupedBodyEffect.dismantle += 0.25 * 4
          break;
        default:
          groupedBodyEffect.dismantle += 0.25 * 1
          break;
      }

      switch (part.boost) {
        case "GH":
          groupedBodyEffect.upgradeController += 1 * 1.5
          break;
        case "GH2O":
          groupedBodyEffect.upgradeController += 1 * 1.8
          break;
        case "XGH2O":
          groupedBodyEffect.upgradeController += 1 * 2
          break;
        default:
          groupedBodyEffect.upgradeController += 1 * 1
          break;
      }
      break;
    case "attack":
      if (!groupedBodyEffect.attack) groupedBodyEffect.attack = 0;
      switch (part.boost) {
        case "UH":
          groupedBodyEffect.attack += 30 * 2
          break;
        case "UH2O":
          groupedBodyEffect.attack += 30 * 3
          break;
        case "XUH2O":
          groupedBodyEffect.attack += 30 * 4
          break;
        default:
          groupedBodyEffect.attack += 30 * 1
          break;
      }
      break;
    case "ranged_attack":
      if (!groupedBodyEffect.rangedAttack) groupedBodyEffect.rangedAttack = 0;
      if (!groupedBodyEffect.rangedMassAttack) groupedBodyEffect.rangedMassAttack = 0;
      switch (part.boost) {
        case "KO":
          groupedBodyEffect.rangedAttack += 10 * 2
          groupedBodyEffect.rangedMassAttack += 4 * 2
          break;
        case "KO2":
          groupedBodyEffect.rangedAttack += 10 * 3
          groupedBodyEffect.rangedMassAttack += 4 * 3
          break;
        case "XKO2":
          groupedBodyEffect.rangedAttack += 10 * 4
          groupedBodyEffect.rangedMassAttack += 4 * 4
          break;
        default:
          groupedBodyEffect.rangedAttack += 10 * 1
          groupedBodyEffect.rangedMassAttack += 4 * 1
          break;
      }
      break;
    case "heal":
      if (!groupedBodyEffect.heal) groupedBodyEffect.heal = 0;
      if (!groupedBodyEffect.rangedHeal) groupedBodyEffect.rangedHeal = 0;
      switch (part.boost) {
        case "LO":
          groupedBodyEffect.heal += 12 * 2
          groupedBodyEffect.rangedHeal += 4 * 2
          break;
        case "LO2":
          groupedBodyEffect.heal += 12 * 3
          groupedBodyEffect.rangedHeal += 4 * 3
          break;
        case "XLO2":
          groupedBodyEffect.heal += 12 * 4
          groupedBodyEffect.rangedHeal += 4 * 4
          break;
        default:
          groupedBodyEffect.heal += 12 * 1
          groupedBodyEffect.rangedHeal += 4 * 1
          break;
      }
      break;
    default:
      break;
  }
}

export default async function prepareObject(object, originalObject) {
  if (originalObject.type === "creep" && originalObject.body && !originalObject.groupedBody) {
    originalObject.groupedBody = {}
    for (let b = 0; b < originalObject.body.length; b += 1) {
      const part = originalObject.body[b];
      if (!originalObject.groupedBody[part.type]) originalObject.groupedBody[part.type] = 0;
      if (part.hits > 0) originalObject.groupedBody[part.type] += 1;
    }
  }

  if (originalObject.type === "creep" && originalObject.body && !originalObject.groupedBodyEffect) {
    originalObject.groupedBodyEffect = {}
    for (let b = 0; b < originalObject.body.length; b += 1) {
      const part = originalObject.body[b];
      getBodyBoostEffect(originalObject.groupedBodyEffect, part);
    }
  }
  object.groupedBody = originalObject.groupedBody || {}
  object.groupedBodyEffect = originalObject.groupedBodyEffect || {}

  if (!object.store) object.store = {}
  if (!originalObject.store) originalObject.store = {}
  const changedStore = Object.entries(object.store);
  for (let i = 0; i < changedStore.length; i += 1) {
    const [resourceType, amount] = changedStore[i];
    originalObject.store[resourceType] = amount;
  }
  if (!originalObject.store.energy) originalObject.store.energy = 0;

  object.type = originalObject.type;
  switch (object.type) {
    case 'controller':
      object.level = originalObject.level;
      if (object._upgraded || object._upgraded === null) {
        originalObject._upgraded = object._upgraded;
        if (object._upgraded === null) object._upgraded = 0;
      }
      if (object._upgraded === undefined && originalObject._upgraded) {
        object._upgraded = originalObject._upgraded;
      }
      break;
    default:
      break;
  }

  // Store intents in array
  const intents = [];

  // If OriginalObject has no cached intent effect assign it to original and object
  if (!originalObject.cachedIntentsEffect) {
    object.cachedIntentsEffect = [];
    originalObject.cachedIntentsEffect = [];
  }
  // Else use cache on object
  else {
    object.cachedIntentsEffect = originalObject.cachedIntentsEffect;
  }

  // If OriginalObject has no actionLog assign it to original and object
  if (!originalObject.actionLog) {
    object.actionLog = {}
    originalObject.actionLog = {}
  }
  // Else if object is missing only actionLog
  else if (!object.actionLog) object.actionLog = {};


  // Check if object has moved
  const hasMoved = (object.x && object.x !== originalObject.x) || (object.y && object.y !== originalObject.y);
  // Assign move intent
  if (hasMoved) {
    originalObject.x = object.x || originalObject.x;
    originalObject.y = object.y || originalObject.y;
    object.actionLog.move = { x: object.x, y: object.y }
  }
  // If object has not moved again remove move intent
  else if (originalObject.actionLog.move) {
    object.actionLog.move = null;
  }

  // Changed intents in current tick
  const actionLogKeys = Object.keys(object.actionLog);
  // If has changed intents
  if (actionLogKeys.length > 0) {
    const originalOjectActionLogKeys = Object.keys(originalObject.actionLog);
    for (let i = 0; i < originalOjectActionLogKeys.length; i += 1) {
      const intentName = originalOjectActionLogKeys[i];
      // If object has already reported intent, keep it
      if (object.actionLog[intentName])
        originalObject.actionLog[intentName] = object.actionLog[intentName];
      // If intent is maybe null, remove it
      else if (!originalObject.actionLog[intentName] || object.actionLog[intentName] === null)
        delete originalObject.actionLog[intentName];
    }

    // Add new intents
    for (let i = 0; i < actionLogKeys.length; i += 1) {
      const intentName = actionLogKeys[i];
      if (object.actionLog[intentName]) {
        originalObject.actionLog[intentName] = object.actionLog[intentName];
      }
    }

    // Get intent effects
    const currentActions = Object.keys(originalObject.actionLog);
    for (let ca = 0; ca < currentActions.length; ca += 1) {
      const intentName = currentActions[ca];
      const intentEffect = getIntentEffect(intentName, originalObject);
      if (intentEffect) intents.push(intentEffect);
    };
    originalObject.cachedIntentsEffect = intents;
    object.cachedIntentsEffect = intents;
  }
}
