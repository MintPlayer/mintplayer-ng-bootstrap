import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsInstanceOfModule } from '@mintplayer/ng-bootstrap/instance-of';
import { MockComponent, MockModule, MockProvider } from 'ng-mocks';

import { BsDockPaneRendererComponent } from './dock-pane-renderer.component';
import { BsDockComponent } from '../dock/dock.component';

describe('BsDockPaneRendererComponent', () => {
  let component: BsDockPaneRendererComponent;
  let fixture: ComponentFixture<BsDockPaneRendererComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockModule(BsInstanceOfModule)
      ],
      declarations: [
        // Unit to test
        BsDockPaneRendererComponent,
      
        // Mock dependencies
        MockComponent(BsDockComponent)
      ],
      providers: [
        { provide: 'DOCK', useClass: MockComponent(BsDockComponent) },
        MockProvider(BsDockComponent)
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BsDockPaneRendererComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
