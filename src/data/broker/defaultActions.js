import fs from "fs";

class ActionProcessor {
  static defaultActionsPerType = {};

  static ActionType = Object.freeze({
    Divide100: 0,
    FirstTickOnly: 1,
  });

  static CreateAction(path, value, type) {
    return { path, value, type };
  }

  static finalizeActions(actions) {
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
          case this.ActionType.Divide100: {
            const action = _actions.reduce(
              (acc, a) => {
                acc.value += a.value;
                return acc;
              },
              { path, value: 0 }
            );
            if (action.value > 0) action.value /= 100;
            finalActions.push(action);
            break;
          }
          case this.ActionType.FirstTickOnly:
            if (_actions[0]) finalActions.push(_actions[0]);
            break;
          default:
            break;
        }
      });
    });

    return finalActions;
  }

  static getStats(actions) {
    const finalActions = this.finalizeActions(actions);
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

  static getDefaultActions(type, isFirstTick = true) {
    const getDivide100Data = (dataList) =>
      dataList.filter((d) => d.type === this.ActionType.Divide100);
    const time = Date.now();
    if (this.defaultActionsPerType[type]) {
      const cached = this.defaultActionsPerType[type];
      if (time - cached.time < 60 * 1000)
        return !isFirstTick ? getDivide100Data(cached.data) : cached.data;
    }

    const folderName = `./files`;
    const fileName = `./files/defaultActions.${type}.json`;
    let data = [];
    if (fs.existsSync(fileName)) data = JSON.parse(fs.readFileSync(fileName));
    else if (fs.existsSync(folderName)) fs.writeFileSync(fileName, JSON.stringify([], null, 2));

    this.defaultActionsPerType[type] = { data, time };
    return !isFirstTick ? getDivide100Data(data) : data;
  }

  static addNewDefaultAction(action, type) {
    const fileName = `./files/defaultActions.${type}.json`;
    let file = JSON.parse(fs.readFileSync(fileName));
    file = file.filter((a) => a.path !== action.path);

    action.value = 0;
    file.push(action);
    fs.writeFileSync(fileName, JSON.stringify(file, null, 2));
    this.defaultActionsPerType[type].data = file;
  }

  static FindNewDefaultActions(_actions, type) {
    const actions = JSON.parse(JSON.stringify(_actions));
    const defaultActions = this.getDefaultActions(type);

    actions
      .filter((v, i, a) => a.findIndex((v2) => v2.path === v.path) === i)
      .forEach((action) => {
        const defaultAction = defaultActions.find(
          (a) => a.path === action.path && a.type === action.type
        );
        if (!defaultAction) {
          this.addNewDefaultAction(action, type);
        }
      });
  }

  static ActionListDefaultValuesFiller(actions, type, isFirstTick) {
    this.getDefaultActions(type, isFirstTick).forEach((defaultAction) => {
      const action = actions.find((a) => a.path === defaultAction.path);
      if (!action) {
        actions.push(defaultAction);
      }
    });

    return actions;
  }

  static groupBy2(acc, value) {
    if (acc === null || value === null) return;

    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i += 1) {
        const innerValue = value[i];
        const typeOfValue = typeof innerValue;
        if (acc[i] === undefined) acc[i] = innerValue;

        if (typeOfValue === "number") {
          acc[i] += innerValue;
        } else this.groupBy2(acc[i], innerValue, acc, value);
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
        } else this.groupBy2(acc[key], innerValue, acc, value);
      }
    }
  }
}

export default ActionProcessor;