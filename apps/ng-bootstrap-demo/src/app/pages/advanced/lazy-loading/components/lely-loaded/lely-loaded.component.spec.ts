import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';

import { LelyLoadedComponent } from './lely-loaded.component';

describe('LelyLoadedComponent', () => {
  let component: LelyLoadedComponent;
  let fixture: ComponentFixture<LelyLoadedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ FormsModule ],
      declarations: [ LelyLoadedComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LelyLoadedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
