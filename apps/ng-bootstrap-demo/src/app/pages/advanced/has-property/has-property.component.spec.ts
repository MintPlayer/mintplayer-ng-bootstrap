import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HasPropertyComponent } from './has-property.component';

describe('HasPropertyComponent', () => {
  let component: HasPropertyComponent;
  let fixture: ComponentFixture<HasPropertyComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [HasPropertyComponent]
    });
    fixture = TestBed.createComponent(HasPropertyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
