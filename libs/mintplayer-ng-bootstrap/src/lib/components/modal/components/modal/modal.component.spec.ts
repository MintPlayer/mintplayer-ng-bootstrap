import { trigger } from '@angular/animations';
import { Overlay, OverlayModule } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { AfterViewInit, Component, ComponentFactoryResolver, ComponentRef, Directive, EventEmitter, InjectionToken, Injector, Input, Output, TemplateRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MODAL_CONTENT } from '../../providers/modal-content.provider';
import { BsModalComponent } from './modal.component';

@Component({
  selector: 'bs-modal-test',
  template: `
    <bs-modal [(isOpen)]="isOpen">
      <div *bsModal>
        <div bsModalHeader>Modal title</div>
        <div bsModalBody>Modal body</div>
        <div bsModalFooter>Footer</div>
      </div>
    </bs-modal>`
})
class BsModalTestComponent {
}

@Component({
  selector: 'bs-modal',
  template: ``
})
class BsModalHostMockComponent implements AfterViewInit {
  constructor(private overlay: Overlay, private parentInjector: Injector, private componentFactoryResolver: ComponentFactoryResolver) { }

  componentInstance?: ComponentRef<BsModalComponent>;
  template!: TemplateRef<any>;

  
  @Input() isOpen = false;
  @Output() isOpenChange = new EventEmitter<boolean>();

  ngAfterViewInit() {
    const injector = Injector.create({
      providers: [
        { provide: MODAL_CONTENT, useValue: this.template }
      ],
      parent: this.parentInjector
    });
    const portal = new ComponentPortal(BsModalComponent, null, injector, this.componentFactoryResolver);
    const overlayRef = this.overlay.create({
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
      positionStrategy: this.overlay.position()
        .global().centerHorizontally().bottom('0').top('0').left('0').right('0'),
      width: '100%',
      hasBackdrop: false
    });
    this.componentInstance = overlayRef.attach<BsModalComponent>(portal);
    this.componentInstance.instance.isOpen = true;
  }
}

@Directive({
  selector: '[bsModal]'
})
class BsModalMockDirective {
  constructor(template: TemplateRef<any>, host: BsModalHostMockComponent) {
    host.template = template;
  }
}

describe('BsModalComponent', () => {
  let component: BsModalTestComponent;
  let fixture: ComponentFixture<BsModalTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        OverlayModule,
        NoopAnimationsModule
      ],
      declarations: [
        // Unit to test
        BsModalComponent,

        // Mock dependencies
        BsModalHostMockComponent,
        BsModalMockDirective,

        // Testbench
        BsModalTestComponent
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsModalTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
