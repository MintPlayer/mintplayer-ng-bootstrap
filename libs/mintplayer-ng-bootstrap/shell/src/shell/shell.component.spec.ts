import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BsShellComponent } from './shell.component';

describe('BsShellComponent', () => {
  let component: BsShellComponent;
  let fixture: ComponentFixture<BsShellComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BsShellComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(BsShellComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
