import fs from "fs";

const defaultActionsPerType = {};

export const ActionType = Object.freeze({
  Divide100: 0,
  FirstTickOnly: 1,
});

export function CreateAction(path, value, type) {
  return { path, value, type };
}

export function finalizeActions(actions) {
  const finalActions = [];

  const actionsByPath = {};
  actions.forEach((action) => {
    if (!actionsByPath[action.type]) actionsByPath[action.type] = {};
    if (!actionsByPath[action.type][action.path])
      actionsByPath[action.type][action.path] = [];
    actionsByPath[action.type][action.path].push(action);
  });

  Object.entries(actionsByPath).forEach(([type, paths]) => {
    Object.entries(paths).forEach(([path, _actions]) => {
      switch (Number(type)) {
        case ActionType.Divide100:
          {
            const action = _actions.reduce(
              (acc, a) => {
                acc.value += a.value;
                return acc;
              },
              { path, value: 0 }
            );
            if (action.value > 0) action.value /= 100;
            finalActions.push(action);
          }
          break;
        case ActionType.FirstTickOnly:
          if (_actions[0]) finalActions.push(_actions[0]);
          break;
        default:
          break;
      }
    });
  });

  return finalActions;
}

export function getStats(actions) {
  const finalActions = finalizeActions(actions);
  const stats = {};

  finalActions.forEach((action) => {
    const path = action.path.split(".");
    const last = path.pop();
    let current = stats;
    path.forEach((key) => {
      if (!current[key]) current[key] = {};
      current = current[key];
    });
    current[last] = action.value;
  });

  return stats;
}

export function getDefaultActions(type, isFirstTick = true) {
  const getDivide100Data = (dataList) =>
    dataList.filter((d) => d.type === ActionType.Divide100);
  const time = Date.now();
  if (defaultActionsPerType[type]) {
    const cached = defaultActionsPerType[type];
    if (time - cached.time < 60 * 1000)
      return !isFirstTick ? getDivide100Data(cached.data) : cached.data;
  }

  const fileName = `./files/defaultActions.${type}.json`;
  let data = [];
  if (fs.existsSync(fileName)) data = JSON.parse(fs.readFileSync(fileName));
  else fs.writeFileSync(fileName, JSON.stringify([], null, 2));

  defaultActionsPerType[type] = { data, time };
  return !isFirstTick ? getDivide100Data(data) : data;
}

function addNewDefaultAction(action, type) {
  const fileName = `./files/defaultActions.${type}.json`;
  let file = JSON.parse(fs.readFileSync(fileName));
  file = file.filter((a) => a.path !== action.path);

  action.value = 0;
  file.push(action);
  fs.writeFileSync(fileName, JSON.stringify(file, null, 2));
  defaultActionsPerType[type].data = file;
}

export function FindNewDefaultActions(_actions, type) {
  const actions = JSON.parse(JSON.stringify(_actions));
  const defaultActions = getDefaultActions(type);

  actions
    .filter((v, i, a) => a.findIndex((v2) => v2.path === v.path) === i)
    .forEach((action) => {
      const defaultAction = defaultActions.find(
        (a) => a.path === action.path && a.type === action.type
      );
      if (!defaultAction) {
        addNewDefaultAction(action, type);
      }
    });
}

export function ActionListDefaultValuesFiller(actions, type, isFirstTick) {
  getDefaultActions(type, isFirstTick).forEach((defaultAction) => {
    const action = actions.find((a) => a.path === defaultAction.path);
    if (!action) {
      actions.push(defaultAction);
    }
  });

  return actions;
}

function groupBy2(acc, value) {

  if (acc === null || value === null) return;

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) {
      const innerValue = value[i];
      const typeOfValue = typeof innerValue;
      if (acc[i] === undefined) acc[i] = innerValue;

      if (typeOfValue === "number") {
        acc[i] += innerValue;
      }
      else groupBy2(acc[i], innerValue, acc, value);
    }
  } else if (typeof value === "object") {
    const valueKeys = Object.keys(value);
    for (let i = 0; i < valueKeys.length; i += 1) {
      const key = valueKeys[i];
      const innerValue = value[key];
      if (acc[key] === undefined) acc[key] = innerValue;

      const typeOfValue = typeof innerValue;
      if (typeOfValue === "number") {
        acc[key] += innerValue;
      }
      else groupBy2(acc[key], innerValue, acc, value);
    }
  }
}

// function groupBy(original, value, obj) {
//   if (original === undefined || original === null)
//     // eslint-disable-next-line no-param-reassign
//     original = JSON.parse(JSON.stringify(value));
//   const typeofValue = typeof value;

//   if (original !== null && value !== null) {
//     if (Array.isArray(value)) {
//       for (let i = 0; i < value.length; i += 1) {
//         original[i] = groupBy(original[i], value[i], obj).original;
//       }
//     } else if (typeofValue === "object") {
//       const valueKeys = Object.keys(value);
//       for (let i = 0; i < valueKeys.length; i += 1) {
//         const key = valueKeys[i];
//         original[key] = groupBy(original[key], value[key], obj).original;
//       }
//     } else if (typeofValue === "number") {
//       // eslint-disable-next-line no-param-reassign
//       original += value;
//     }
//   }
//   return { original, value };
// }

export function handleCombinedRoomStats(shards, type) {
  const defaultStats = getStats(getDefaultActions(type));
  const stats = {};

  const shardKeys = Object.keys(shards);
  for (let i = 0; i < shardKeys.length; i += 1) {
    const shardName = shardKeys[i];
    const rooms = shards[shardName];
    if (!stats[shardName]) stats[shardName] = JSON.parse(JSON.stringify(defaultStats));

    const roomKeys = Object.keys(rooms);
    for (let j = 0; j < roomKeys.length; j += 1) {
      const roomName = roomKeys[j];
      const roomStats = rooms[roomName];
      groupBy2(
        stats[shardName],
        JSON.parse(JSON.stringify(roomStats)),
        {
          base: stats[shardName],
          roomStats,
        }
      );
    }
  }

  return stats;
}
