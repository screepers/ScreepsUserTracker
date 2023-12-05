import { getIntentEffect } from "./helper.js";

export default function GetIntents(objects, originalObjects) {
  const intents = [];

  const originalIds = Object.keys(originalObjects);
  for (let oi = 0; oi < originalIds.length; oi += 1) {
    const originalId = originalIds[oi];
    const originalObject = originalObjects[originalId] || {};
    const object = objects[originalId];
    if (!originalObject.actionLog) {
      originalObject.actionLog = {};
    }
    const newActionLogKeys = object ? Object.keys(object.actionLog || {}) : {};
    if (newActionLogKeys.length === 0) {
      return originalObject.cachedIntentsEffect || []
    }

    // Remove old intents
    const actionLogKeys = Object.keys(originalObject.actionLog);
    for (let i = 0; i < actionLogKeys.length; i += 1) {
      const intentName = actionLogKeys[i];
      if (object && object.actionLog && object.actionLog[intentName] !== undefined)
        originalObject.actionLog[intentName] = object.actionLog[intentName];

      if (!originalObject.actionLog[intentName])
        delete originalObject.actionLog[intentName];
    }

    // Add new intents
    if (object && object.actionLog) {
      for (let i = 0; i < newActionLogKeys.length; i += 1) {
        const intentName = newActionLogKeys[i];
        if (object.actionLog[intentName]) {
          originalObject.actionLog[intentName] = object.actionLog[intentName];
        }
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
  };

  return intents;
}
