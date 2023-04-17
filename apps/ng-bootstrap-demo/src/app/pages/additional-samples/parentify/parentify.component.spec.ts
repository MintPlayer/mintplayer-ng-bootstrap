import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ParentifyComponent } from './parentify.component';

describe('ParentifyComponent', () => {
  let component: ParentifyComponent;
  let fixture: ComponentFixture<ParentifyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ParentifyComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ParentifyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
