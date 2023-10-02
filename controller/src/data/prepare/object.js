import { GetUsernameById } from "../../rooms/userHelper.js";

export default function prepareObject(object, originalObject) {
  if (object.user) {
    object.username = GetUsernameById(object.user);
    delete object.user;
  }

  if (object.type === "creep") {
    if (Array.isArray(object.body))
      object.body = object.body.reduce((acc, part) => {
        if (!acc[part.type]) acc[part.type] = 0;
        acc[part.type] += 1;
        return acc;
      }, {});
  }

  object.type = originalObject.type;
}
