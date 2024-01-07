export default async function prepareObject(object, originalObject) {
  if (originalObject.type === "creep") {
    if (Array.isArray(object.body))
      object.body = object.body.reduce((acc, part) => {
        if (!acc[part.type]) acc[part.type] = 0;
        acc[part.type] += 1;
        return acc;
      }, {});
    originalObject.body = object.body
  }

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
}
