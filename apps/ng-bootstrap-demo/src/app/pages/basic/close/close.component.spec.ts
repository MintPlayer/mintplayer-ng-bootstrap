import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CloseComponent } from './close.component';

@Component({
  selector: 'bs-close',
  template: `<button>Close</button>`
})
class BsCloseMockComponent { }

describe('CloseComponent', () => {
  let component: CloseComponent;
  let fixture: ComponentFixture<CloseComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        // Unit to test
        CloseComponent,
      
        // Mock dependencies
        BsCloseMockComponent
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CloseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
