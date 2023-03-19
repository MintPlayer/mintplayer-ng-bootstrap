import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BsDockComponent } from './dock.component';

describe('BsDockComponent', () => {
  let component: BsDockComponent;
  let fixture: ComponentFixture<BsDockComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BsDockComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BsDockComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
