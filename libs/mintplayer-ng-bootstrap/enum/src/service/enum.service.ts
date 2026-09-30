import { Injectable } from '@angular/core';
import { EnumItem } from '../interfaces/enum-item';

/**
 * Reads the members of a TypeScript enum object.
 *
 * A numeric enum compiles to an object holding both directions (`{ 0: 'a', a: 0 }`); a string
 * enum holds only names (`{ A: 'a' }`); a mixed enum holds reverse entries for its numeric
 * members only. A member NAME can never be a numeric string, so the names are exactly the keys
 * that are not numbers, whatever kind of enum it is. (Splitting `Object.keys` in half, as this
 * did before, only worked for purely numeric enums: a string enum lost half its members.)
 */
@Injectable({
  providedIn: 'root'
})
export class EnumService {

  /** The member names, in declaration order. */
  public getKeys(en: Record<string, unknown>): string[] {
    return Object.keys(en).filter((key) => Number.isNaN(Number(key)));
  }

  /** The member values, in declaration order. */
  public getValues<V = number>(en: Record<string, unknown>): V[] {
    return this.getKeys(en).map((key) => en[key] as V);
  }

  /** Name/value pairs, in declaration order. */
  public getItems<V = number>(en: Record<string, unknown>): EnumItem<V>[] {
    return this.getKeys(en).map((key) => ({ key, value: en[key] as V }));
  }

}
