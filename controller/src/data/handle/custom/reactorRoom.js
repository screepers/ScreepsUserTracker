import { findAllByType } from "../../helper.js";
import {
  CreateAction,
  ActionType,
  ActionListDefaultValuesFiller,
} from "../helper.js";

export default function handleObjects(objects, extras = {}) {
  const currentTick = parseInt(extras.tick, 10);

  let actions = [];
  const reactors = findAllByType(objects, "reactor");
  const originalReactor = reactors[0];

  if (originalReactor) {
    actions.push(
      CreateAction(
        "season.activeReactors",
        originalReactor.launchTime ? 1 : 0,
        ActionType.FirstTickOnly
      )
    );

    if (originalReactor.launchTime) {
      const continuousTicks = currentTick - originalReactor.launchTime;
      actions.push(
        CreateAction(
          "season.continuousTicks",
          continuousTicks,
          ActionType.FirstTickOnly
        )
      );

      const score = 1 + Math.floor(Math.log10(continuousTicks));
      actions.push(
        CreateAction("season.scorePerTick", score, ActionType.FirstTickOnly)
      );
    }
  }

  actions = actions.concat(ActionListDefaultValuesFiller(actions, extras.type));
  return actions;
}