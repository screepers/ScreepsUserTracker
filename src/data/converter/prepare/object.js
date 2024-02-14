import { getIntentEffect } from "../helper.js";

export default async function prepareObject(object, originalObject) {
  if (originalObject.type === "creep" && originalObject.body && !originalObject.groupedBody) {
    originalObject.groupedBody = {}
    for (let b = 0; b < originalObject.body.length; b += 1) {
      const part = originalObject.body[b];
      if (!originalObject.groupedBody[part.type]) originalObject.groupedBody[part.type] = 0;
      originalObject.groupedBody[part.type] += 1;
    }
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

  if (!object.actionLog) object.actionLog = {};
  const hasMoved = object.x !== originalObject.x || object.y !== originalObject.y;
  if (hasMoved) {
    originalObject.x = object.x || originalObject.x;
    originalObject.y = object.y || originalObject.y;
    object.actionLog.move = { x: object.x, y: object.y }
  }
  else if (originalObject.actionLog.move) {
    object.actionLog.move = null;
  }


  const newActionLogKeys = Object.keys(object.actionLog);
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
