import { Injectable } from '@angular/core';
import { EnumItem } from '../../interfaces/enum-item';

@Injectable({
  providedIn: 'root'
})
export class EnumService {

  public getKeys(en: Object) {
    const items = Object.keys(en);
    const halfLength = items.length / 2;
    return items.slice(halfLength);
  }
  
  public getValues(en: Object) {
    const items = Object.keys(en);
    const halfLength = items.length / 2;
    return items.slice(0, halfLength);
  }

  public getItems(en: Object) {
    return this.getKeys(en).map((key) => {
      return <EnumItem>{
        key,
        value: (<any>en)[key],
      }
    });
  }

}
