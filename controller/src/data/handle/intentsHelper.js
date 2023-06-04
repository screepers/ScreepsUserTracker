import { getIntentEffect, findOriginalObject } from "../helper.js";

export default function GetIntents(objects, currentObjects, ticks) {
  const intents = [];
  const ids = Object.keys(objects);
  ids.forEach((id) => {
    const object = objects[id] || {};
    let current = currentObjects[id];
    if (!current) {
      currentObjects[id] = object;
      current = currentObjects[id];
    }
    if (!current.actionLog) {
      current.actionLog = {};
    }

    Object.keys(object.actionLog || {}).forEach((intentName) => {
      if (object.actionLog[intentName])
        current.actionLog[intentName] = object.actionLog[intentName];
      else delete current.actionLog[intentName];
    });

    const currentActions = Object.keys(current.actionLog);
    if (currentActions.length) {
      const originalObject = findOriginalObject(id, ticks);
      currentActions.forEach((intentName) => {
        const intentEffect = getIntentEffect(intentName, originalObject);
        if (intentEffect) intents.push(intentEffect);
      });
    }
  });

  return intents;
}
