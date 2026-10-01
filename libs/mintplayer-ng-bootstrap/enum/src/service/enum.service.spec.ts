import { TestBed } from '@angular/core/testing';

import { EnumService } from './enum.service';

enum Numeric { primary, secondary, danger }
enum Explicit { low = 10, high = 20 }
enum Strings { Up = 'UP', Down = 'DOWN', Left = 'LEFT' }
enum Mixed { No = 0, Yes = 'YES' }

describe('EnumService', () => {
  let service: EnumService;

  beforeEach(() => {
    service = TestBed.inject(EnumService);
  });

  it('reads a numeric enum without its reverse mapping', () => {
    expect(service.getKeys(Numeric)).toEqual(['primary', 'secondary', 'danger']);
    expect(service.getValues(Numeric)).toEqual([0, 1, 2]);
    expect(service.getItems(Numeric)).toEqual([
      { key: 'primary', value: 0 },
      { key: 'secondary', value: 1 },
      { key: 'danger', value: 2 },
    ]);
  });

  it('reads a numeric enum with explicit values', () => {
    expect(service.getItems(Explicit)).toEqual([{ key: 'low', value: 10 }, { key: 'high', value: 20 }]);
  });

  it('reads every member of a string enum (it has no reverse mapping to halve)', () => {
    expect(service.getKeys(Strings)).toEqual(['Up', 'Down', 'Left']);
    expect(service.getValues<string>(Strings)).toEqual(['UP', 'DOWN', 'LEFT']);
  });

  it('reads a mixed enum, whose reverse mapping covers only the numeric members', () => {
    expect(service.getItems<number | string>(Mixed)).toEqual([{ key: 'No', value: 0 }, { key: 'Yes', value: 'YES' }]);
  });
});
