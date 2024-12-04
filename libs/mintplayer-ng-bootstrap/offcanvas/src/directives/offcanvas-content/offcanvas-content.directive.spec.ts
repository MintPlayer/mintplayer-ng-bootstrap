import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OverlayModule } from '@angular/cdk/overlay';
import { BsOffcanvasContentDirective } from './offcanvas-content.directive';
import { BsOffcanvasHostComponent } from '../../components/offcanvas-host/offcanvas-host.component';
import { MockComponent } from 'ng-mocks';
import { BsOffcanvasComponent } from '../../components/offcanvas/offcanvas.component';
import { OffcanvasHeaderComponent } from '../../components/offcanvas-header/offcanvas-header.component';
import { OffcanvasBodyComponent } from '../../components/offcanvas-body/offcanvas-body.component';


describe('BsOffcanvasContentDirective', () => {
  let component: BsOffcanvasTestComponent;
  let fixture: ComponentFixture<BsOffcanvasTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ CommonModule, OverlayModule ],
      declarations: [
        // Unit to test
        BsOffcanvasContentDirective,
        
        // Mock dependencies
        MockComponent(BsOffcanvasComponent),
        MockComponent(OffcanvasHeaderComponent),
        MockComponent(OffcanvasBodyComponent),
        MockComponent(BsOffcanvasHostComponent),

        // Testbench
        BsOffcanvasTestComponent,
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsOffcanvasTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

type OffcanvasPosition = 'top' | 'bottom' | 'start' | 'end';

@Component({
  selector: 'bs-offcanvas-test',
  standalone: false,
  template: `
    <bs-offcanvas [(isVisible)]="isOffcanvasVisible" [position]="position" [hasBackdrop]="true" (backdropClick)="isOffcanvasVisible = false">
        <div *bsOffcanvasContent>
            <bs-offcanvas-header>
                <h5>Offcanvas</h5>
            </bs-offcanvas-header>
            <bs-offcanvas-body>
                <span>Content</span>
            </bs-offcanvas-body>
        </div>
    </bs-offcanvas>`
})
class BsOffcanvasTestComponent {
  isOffcanvasVisible = false;
  position: OffcanvasPosition = 'start';
}