import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsParallaxComponent } from './parallax.component';
import { Component } from '@angular/core';

@Component({
  selector: 'bs-parallax-test',
  standalone: true,
  imports: [BsParallaxComponent],
  template: `<bs-parallax [image]="'/assets/test.png'"></bs-parallax>`
})
class BsParallaxTestComponent {}

describe('BsParallaxComponent', () => {
  let component: BsParallaxTestComponent;
  let fixture: ComponentFixture<BsParallaxTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        // Unit to test
        BsParallaxComponent,
      
        // Testbed
        BsParallaxTestComponent
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BsParallaxTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
