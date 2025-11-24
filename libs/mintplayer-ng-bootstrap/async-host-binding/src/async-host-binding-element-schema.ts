// import { DomElementSchemaRegistry, SchemaMetadata } from '@angular/compiler';

// /**
//  * Allows host bindings that start with "$." (used by the async host binding plugin)
//  * without disabling all schema checks (NO_ERRORS_SCHEMA).
//  */
// export class AsyncHostBindingElementSchema extends DomElementSchemaRegistry {
//   override hasProperty(tagName: string, property: string, schemaMetas: SchemaMetadata[]): boolean {
//     if (property.startsWith('$.')) {
//       return true;
//     }

//     return super.hasProperty(tagName, property, schemaMetas);
//   }
// }
