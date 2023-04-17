// export function parentify(obj: any): any {
//   const newObj = {};

//   for (const prop in obj) {
//     const propValue = obj[prop];
//     if (typeof propValue === "object") {
//       if (propValue['$parents']) {
//         propValue['$parents'] = [...propValue['$parents'], obj];
//       } else {
//         propValue['$parents'] = [obj];
//       }
//     } else{
//       Object.assign(obj, { [prop]: propValue });
//     }
//   }

//   return obj;
// }

export function deepClone(obj: any): any {
  debugger;
  const existing = new Map<any, any>();
  const result = deepCloneRecursive(obj, existing);
  return result;
}

function deepCloneRecursive(obj: any, existingObjects: Map<any, any>) {
  const newObj = {};
  if (!existingObjects.has(obj)) {
    existingObjects.set(obj, newObj);
  }

  for (const prop in obj) {
    const propValue = obj[prop];
    if (typeof propValue === "object") {
      if (existingObjects.has(propValue)) {
        Object.assign(newObj, { [prop]: existingObjects.get(propValue) });
      } else {
        const clone = deepCloneRecursive(propValue, existingObjects);

        // // This is too late. Must be called before deepCloneRecursive
        // existingObjects.set(propValue, clone);
        Object.assign(newObj, { [prop]: clone });
      }
    } else {
      Object.assign(newObj, { [prop]: propValue });
    }
  }

  return newObj;
}