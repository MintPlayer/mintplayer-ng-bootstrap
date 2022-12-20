import { Overlay, OverlayConfig, OverlayModule, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { Component, ComponentFactoryResolver, ElementRef, Injectable, Injector, TemplateRef, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MockModule, MockProvider } from 'ng-mocks';
import { SNACKBAR_CONTENT } from '../providers/snackbar-content.provider';
import { BsSnackbarService } from '../service/snackbar.service';

import { BsSnackbarComponent } from './snackbar.component';

// @Injectable({ providedIn: 'root' })
// class OverlayMock {
//     create(config?: OverlayConfig) {
//         return new OverlayRef({
//             attach: () => {},
//             detach: () => {},
//             dispose: () => {},
//             hasAttached: () => true
//         }, null, null, null, null, null, null, null, null);
//     }
// }

@Component({
  selector: 'snackbar-test-component',
  template: `
    <ng-template #snackbarTemplate let-snackbar>
        <div class="text-nowrap p-2 d-flex flex-row align-items-center justify-content-between">
            <span class="">You have new notifications</span>
            <button>Open</button>
        </div>
    </ng-template>`
})
class BsSnackbarTestComponent {
  constructor(
    private overlay: Overlay,
    private parentInjector: Injector,
    private componentFactoryResolver: ComponentFactoryResolver
  ) {}

  @ViewChild('snackbarTemplate') public snackbarTemplate!: ElementRef<TemplateRef<any>>;

  showSnackbar() {
    const injector = Injector.create({
      providers: [{ provide: SNACKBAR_CONTENT, useValue: this.snackbarTemplate }],
      parent: this.parentInjector,
    });
    const portal = new ComponentPortal(BsSnackbarComponent, null, injector, this.componentFactoryResolver);
    // const overlayRef = this.overlay.create({});
    // overlayRef.attach<BsSnackbarComponent>(portal);
  }
}

describe('BsSnackbarComponent', () => {
  let component: BsSnackbarTestComponent;
  let fixture: ComponentFixture<BsSnackbarTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockModule(OverlayModule),
        NoopAnimationsModule
      ],
      declarations: [
        // Unit to test
        BsSnackbarComponent,

        // Testbench
        BsSnackbarTestComponent,
      ],
      providers: [
        MockProvider(BsSnackbarService),
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsSnackbarTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show the snackbar', () => {
    component.showSnackbar();
  });
});
