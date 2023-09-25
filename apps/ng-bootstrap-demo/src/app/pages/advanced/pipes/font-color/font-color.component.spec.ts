import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FontColorComponent } from './font-color.component';

describe('FontColorComponent', () => {
  let component: FontColorComponent;
  let fixture: ComponentFixture<FontColorComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [FontColorComponent]
    });
    fixture = TestBed.createComponent(FontColorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
