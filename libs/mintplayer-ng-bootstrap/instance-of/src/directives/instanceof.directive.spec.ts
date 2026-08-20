import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

// Imported through the public entrypoint, the way a consumer reaches them.
import {
  BsInstanceOfDirective,
  BsInstanceofCaseDirective,
  BsInstanceOfDefaultDirective,
} from '@mintplayer/ng-bootstrap/instance-of';

class Animal {
  constructor(public name: string) {}
}
class Dog extends Animal {}
class Cat extends Animal {}
class Rock {
  constructor(public name: string) {}
}

@Component({
  standalone: true,
  imports: [BsInstanceOfDirective, BsInstanceofCaseDirective, BsInstanceOfDefaultDirective],
  template: `
    <div [bsInstanceof]="value()">
      <span *bsInstanceofCase="Dog; let d">dog:{{ d.name }}</span>
      <span *bsInstanceofCase="Cat; let c">cat:{{ c.name }}</span>
      <span *bsInstanceofDefault>none</span>
    </div>
  `,
})
class CasesWithDefaultHost {
  readonly value = signal<unknown>(null);
  readonly Dog = Dog;
  readonly Cat = Cat;
}

@Component({
  standalone: true,
  imports: [BsInstanceOfDirective, BsInstanceofCaseDirective],
  template: `
    <div [bsInstanceof]="value()">
      <span *bsInstanceofCase="Animal; let a">animal:{{ a.name }}</span>
      <span *bsInstanceofCase="Dog; let d">dog:{{ d.name }}</span>
    </div>
  `,
})
class OverlappingCasesHost {
  readonly value = signal<unknown>(null);
  readonly Animal = Animal;
  readonly Dog = Dog;
}

@Component({
  standalone: true,
  imports: [BsInstanceOfDirective, BsInstanceOfDefaultDirective],
  template: `
    <div [bsInstanceof]="value()">
      <span *bsInstanceofDefault>fallback</span>
    </div>
  `,
})
class DefaultOnlyHost {
  readonly value = signal<unknown>(null);
}

@Component({
  standalone: true,
  imports: [BsInstanceofCaseDirective],
  template: `<span *bsInstanceofCase="Dog">orphan</span>`,
})
class OrphanCaseHost {
  readonly Dog = Dog;
}

@Component({
  standalone: true,
  imports: [BsInstanceOfDefaultDirective],
  template: `<span *bsInstanceofDefault>orphan</span>`,
})
class OrphanDefaultHost {}

const text = (fixture: ComponentFixture<unknown>) =>
  (fixture.nativeElement as HTMLElement).textContent!.trim();

describe('bsInstanceof directives', () => {
  describe('with cases and a default', () => {
    let fixture: ComponentFixture<CasesWithDefaultHost>;
    let host: CasesWithDefaultHost;

    beforeEach(async () => {
      await TestBed.configureTestingModule({ imports: [CasesWithDefaultHost] }).compileComponents();
      fixture = TestBed.createComponent(CasesWithDefaultHost);
      host = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('renders the default while the value matches no case', () => {
      expect(text(fixture)).toBe('none');
    });

    it('renders the default for null and for undefined', () => {
      host.value.set(undefined);
      fixture.detectChanges();
      expect(text(fixture)).toBe('none');
    });

    it('renders the default for a value of an unrelated class', () => {
      host.value.set(new Rock('granite'));
      fixture.detectChanges();
      expect(text(fixture)).toBe('none');
    });

    it('renders the default for a primitive value', () => {
      host.value.set('Dog');
      fixture.detectChanges();
      expect(text(fixture)).toBe('none');
    });

    it('renders the matching case and drops the default', () => {
      host.value.set(new Dog('Rex'));
      fixture.detectChanges();
      expect(text(fixture)).toBe('dog:Rex');
    });

    it('exposes the narrowed value as the template context', () => {
      host.value.set(new Cat('Tom'));
      fixture.detectChanges();
      expect(text(fixture)).toBe('cat:Tom');
    });

    it('swaps one matched case for another when the value changes class', () => {
      host.value.set(new Dog('Rex'));
      fixture.detectChanges();
      expect(text(fixture)).toBe('dog:Rex');

      host.value.set(new Cat('Tom'));
      fixture.detectChanges();
      expect(text(fixture)).toBe('cat:Tom');
    });

    it('updates the rendered context in place for a new instance of the same class', () => {
      host.value.set(new Dog('Rex'));
      fixture.detectChanges();
      const rendered = (fixture.nativeElement as HTMLElement).querySelector('span');

      host.value.set(new Dog('Fido'));
      fixture.detectChanges();
      expect(text(fixture)).toBe('dog:Fido');
      expect((fixture.nativeElement as HTMLElement).querySelector('span')).toBe(rendered);
    });

    it('brings the default back when the value stops matching', () => {
      host.value.set(new Dog('Rex'));
      fixture.detectChanges();
      host.value.set(null);
      fixture.detectChanges();
      expect(text(fixture)).toBe('none');
    });

    it('renders exactly one view at a time', () => {
      host.value.set(new Dog('Rex'));
      fixture.detectChanges();
      expect((fixture.nativeElement as HTMLElement).querySelectorAll('span').length).toBe(1);
    });
  });

  describe('with overlapping cases and no default', () => {
    let fixture: ComponentFixture<OverlappingCasesHost>;
    let host: OverlappingCasesHost;

    beforeEach(async () => {
      await TestBed.configureTestingModule({ imports: [OverlappingCasesHost] }).compileComponents();
      fixture = TestBed.createComponent(OverlappingCasesHost);
      host = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('renders nothing when no case matches and no default is declared', () => {
      expect(text(fixture)).toBe('');
    });

    it('matches a subclass instance against its base class', () => {
      host.value.set(new Cat('Tom'));
      fixture.detectChanges();
      expect(text(fixture)).toBe('animal:Tom');
    });

    it('renders every matching case, not only the first', () => {
      // Unlike a switch, each case is evaluated independently: a Dog is an
      // Animal too, so both templates render.
      host.value.set(new Dog('Rex'));
      fixture.detectChanges();
      expect((fixture.nativeElement as HTMLElement).querySelectorAll('span').length).toBe(2);
      expect(text(fixture)).toContain('animal:Rex');
      expect(text(fixture)).toContain('dog:Rex');
    });

    it('keeps the base-class case and drops the subclass case when the value narrows away', () => {
      host.value.set(new Dog('Rex'));
      fixture.detectChanges();
      host.value.set(new Cat('Tom'));
      fixture.detectChanges();
      expect((fixture.nativeElement as HTMLElement).querySelectorAll('span').length).toBe(1);
      expect(text(fixture)).toBe('animal:Tom');
    });
  });

  describe('with a default and no cases', () => {
    it('renders the default regardless of the value', async () => {
      await TestBed.configureTestingModule({ imports: [DefaultOnlyHost] }).compileComponents();
      const fixture = TestBed.createComponent(DefaultOnlyHost);
      fixture.detectChanges();
      expect(text(fixture)).toBe('fallback');

      fixture.componentInstance.value.set(new Dog('Rex'));
      fixture.detectChanges();
      expect(text(fixture)).toBe('fallback');
    });
  });

  describe('outside a bsInstanceof host', () => {
    it('rejects a case directive with an actionable message', async () => {
      await TestBed.configureTestingModule({ imports: [OrphanCaseHost] }).compileComponents();
      expect(() => TestBed.createComponent(OrphanCaseHost).detectChanges()).toThrowError(
        /bsInstanceofCase.*must be located inside an element with the "bsInstanceof" attribute/s
      );
    });

    it('rejects a default directive with an actionable message', async () => {
      await TestBed.configureTestingModule({ imports: [OrphanDefaultHost] }).compileComponents();
      expect(() => TestBed.createComponent(OrphanDefaultHost).detectChanges()).toThrowError(
        /bsInstanceofDefault.*must be located inside an element with the "bsInstanceof" attribute/s
      );
    });
  });
});
