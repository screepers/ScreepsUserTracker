import { getIntentEffect } from "../helper.js";

export default async function prepareObject(object, originalObject) {
  if (originalObject.type === "creep" && originalObject.body && !originalObject.body.groupedBody) {
    originalObject.groupedBody = originalObject.body.reduce((acc, part) => {
      if (!acc[part.type]) acc[part.type] = 0;
      acc[part.type] += 1;
      return acc;
    }, {});
  }
  object.groupedBody = originalObject.groupedBody || []

  object.type = originalObject.type;

  switch (object.type) {
    case 'controller':
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

  const intents = [];
  if (!originalObject.cachedIntentsEffect) {
    object.cachedIntentsEffect = [];
    originalObject.cachedIntentsEffect = [];
  }
  else {
    object.cachedIntentsEffect = originalObject.cachedIntentsEffect;
  }
  if (!originalObject.actionLog) {
    object.actionLog = {};
    originalObject.actionLog = {};
  }
  const newActionLogKeys = object ? Object.keys(object.actionLog || {}) : {};
  if (newActionLogKeys.length > 0) {
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
    object.cachedIntentsEffect = intents;
  }
}
