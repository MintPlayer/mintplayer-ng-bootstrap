export function deepClone(obj: any, parentify: boolean): any {
  const existing = new Map<any, any>();
  const result = deepCloneRecursive(obj, existing, parentify);
  return result;
}

function deepCloneRecursive(obj: any, existingClones: Map<any, any>, parentify: boolean) {
  const objClone = {};
  if (!existingClones.has(obj)) {
    existingClones.set(obj, objClone);
  }

  for (const prop in obj) {
    const propValue = obj[prop];
    if (typeof propValue === "object") {
      let propValueClone;
      if (existingClones.has(propValue)) {
        propValueClone = existingClones.get(propValue);
        Object.assign(objClone, { [prop]: propValueClone });
      } else {
        propValueClone = deepCloneRecursive(propValue, existingClones, parentify);

        // // This is too late. Must be called before deepCloneRecursive
        // existingClones.set(propValue, clone);
        Object.assign(objClone, { [prop]: propValueClone });
      }

      if (parentify && propValue) {
        if (propValueClone['$parents']) {
          Object.assign(propValueClone, { '$parents': [...propValueClone['$parents'], objClone] });
        } else {
          Object.assign(propValueClone, { '$parents': [objClone] });
        }
      }
    } else {
      Object.assign(objClone, { [prop]: propValue });
    }
  }

  return objClone;
}