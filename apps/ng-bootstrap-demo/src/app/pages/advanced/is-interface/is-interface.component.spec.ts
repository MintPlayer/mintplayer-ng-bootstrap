import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IsInterfaceComponent } from './is-interface.component';

describe('IsInterfaceComponent', () => {
  let component: IsInterfaceComponent;
  let fixture: ComponentFixture<IsInterfaceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IsInterfaceComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(IsInterfaceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
