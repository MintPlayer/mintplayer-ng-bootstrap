import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SlugifyComponent } from './slugify.component';

describe('SlugifyComponent', () => {
  let component: SlugifyComponent;
  let fixture: ComponentFixture<SlugifyComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [SlugifyComponent]
    });
    fixture = TestBed.createComponent(SlugifyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
