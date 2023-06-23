import { getIntentEffect } from "../helper.js";

export default function GetIntents(objects, originalObjects) {
  const intents = [];
  const ids = Object.keys(objects);
  ids.forEach((id) => {
    const object = objects[id] || {};
    let current = originalObjects[id];
    if (!current) {
      originalObjects[id] = object;
      current = originalObjects[id];
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
      const originalObject = originalObjects[id];
      currentActions.forEach((intentName) => {
        const intentEffect = getIntentEffect(intentName, originalObject);
        if (intentEffect) intents.push(intentEffect);
      });
    }
  });

  return intents;
}
