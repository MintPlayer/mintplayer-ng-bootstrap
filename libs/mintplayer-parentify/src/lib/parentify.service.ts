export function deepClone(obj: any, parentify: boolean, allowedTypes: any[], preserveTypes?: boolean, precache?: Map<any, any>) {
  console.log('deepclone', obj);
  const existing = precache ?? new Map<any, any>();
  const result = deepCloneRecursive(obj, existing, parentify, allowedTypes, preserveTypes);
  return {
    result,
    cache: existing,
  };
}

function deepCloneRecursive(obj: any, existingClones: Map<any, any>, parentify: boolean, allowedTypes?: any[], preserveTypes?: boolean) {
  const objClone = preserveTypes ? Object.create(Object.getPrototypeOf(obj)) : {};
  if (!existingClones.has(obj)) {
    existingClones.set(obj, objClone);
  }

  Object.assign(objClone, { '$original': obj });

  for (const prop in obj) {
    if (['$parents', '$original'].includes(prop)) {
      continue;
    }

    const propValue = obj[prop];
    // const t = typeof propValue;
    if ((typeof propValue === "object") && (!allowedTypes || allowedTypes.some(at => propValue instanceof at))) {
      let propValueClone;
      if (existingClones.has(propValue)) {
        propValueClone = existingClones.get(propValue);
        Object.assign(objClone, { [prop]: propValueClone });
      } else {
        propValueClone = deepCloneRecursive(propValue, existingClones, parentify, allowedTypes, preserveTypes);

        // // This is too late. Must be called before deepCloneRecursive
        // existingClones.set(propValue, clone);
        Object.assign(objClone, { [prop]: propValueClone });
      }

      if (parentify && propValueClone) {
        if (propValueClone['$parents']) {
          Object.assign(propValueClone, { '$parents': [...propValueClone['$parents'], objClone] });
        } else {
          Object.assign(propValueClone, { '$parents': [objClone] });
        }
      }
    } else if (propValue instanceof Array) {
      
      const arrayClones = propValue.map(v => deepCloneRecursive(v, existingClones, parentify, allowedTypes, preserveTypes));
      if (parentify) {
        arrayClones.filter(clone => clone).forEach(clone => {
          if ((<any>clone)['$parents']) {
            Object.assign(clone, { '$parents': [...(<any>clone)['$parents'], objClone] });
          } else {
            Object.assign(clone, { '$parents': [objClone] });
          }
        });
      }
      Object.assign(objClone, { [prop]: arrayClones });

    } else {
      Object.assign(objClone, { [prop]: propValue });
    }
  }

  return objClone;
}