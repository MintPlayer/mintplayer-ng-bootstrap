import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { BsInstanceofPipe } from '@mintplayer/ng-bootstrap/instance-of';

class Animal {
  constructor(public name: string) {}
}
class Dog extends Animal {}
class Rock {
  constructor(public name: string) {}
}

@Component({
  standalone: true,
  imports: [BsInstanceofPipe],
  template: `<span>{{ (value() | bsInstanceof: Animal)?.name ?? 'no-match' }}</span>`,
})
class PipeHost {
  readonly value = signal<unknown>(null);
  readonly Animal = Animal;
}

describe('BsInstanceofPipe', () => {
  let pipe: BsInstanceofPipe;

  beforeEach(() => {
    pipe = new BsInstanceofPipe();
  });

  it('returns the value itself when it is an instance of the type', () => {
    const dog = new Dog('Rex');
    expect(pipe.transform(dog, Dog)).toBe(dog);
  });

  it('matches a subclass instance against its base class', () => {
    const dog = new Dog('Rex');
    expect(pipe.transform(dog, Animal)).toBe(dog);
  });

  it('returns undefined for an instance of an unrelated class', () => {
    expect(pipe.transform(new Rock('granite'), Animal)).toBeUndefined();
  });

  it('does not match a base-class instance against a subclass', () => {
    expect(pipe.transform(new Animal('generic'), Dog)).toBeUndefined();
  });

  it('returns undefined for null and undefined', () => {
    expect(pipe.transform(null, Animal)).toBeUndefined();
    expect(pipe.transform(undefined, Animal)).toBeUndefined();
  });

  it('returns undefined for primitives', () => {
    expect(pipe.transform('Animal', Animal)).toBeUndefined();
    expect(pipe.transform(42, Animal)).toBeUndefined();
  });

  it('narrows in a template and re-evaluates when the value changes', async () => {
    await TestBed.configureTestingModule({ imports: [PipeHost] }).compileComponents();
    const fixture = TestBed.createComponent(PipeHost);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toBe('no-match');

    fixture.componentInstance.value.set(new Dog('Rex'));
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toBe('Rex');

    fixture.componentInstance.value.set(new Rock('granite'));
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toBe('no-match');
  });
});
