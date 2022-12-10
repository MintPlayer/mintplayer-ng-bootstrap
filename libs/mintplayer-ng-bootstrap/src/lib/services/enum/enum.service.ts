import { Injectable } from '@angular/core';
import { EnumItem } from '../../interfaces/enum-item';

@Injectable({
  providedIn: 'root'
})
export class EnumService {

  public getKeys(en: Record<string, unknown>) {
    const items = Object.keys(en);
    const halfLength = items.length / 2;
    return items.slice(halfLength);
  }
  
  public getValues(en: Record<string, unknown>) {
    const items = Object.keys(en);
    const halfLength = items.length / 2;
    return items.slice(0, halfLength);
  }

  public getItems(en: Record<string, unknown>) {
    return this.getKeys(en).map((key) => {
      return <EnumItem>{
        key,
        value: en[key],
      }
    });
  }

}
