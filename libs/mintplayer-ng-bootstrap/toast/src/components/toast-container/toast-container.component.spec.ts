import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockModule, MockProvider } from 'ng-mocks';
import { BsToastContainerComponent } from './toast-container.component';
import { BsHasOverlayComponent } from '@mintplayer/ng-bootstrap/has-overlay';
import { BsToastService } from '../../services/toast/toast.service';

describe('BsToastContainerComponent', () => {
  let component: BsToastContainerComponent;
  let fixture: ComponentFixture<BsToastContainerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockModule(BsHasOverlayComponent),
      ],
      declarations: [BsToastContainerComponent],
      providers: [
        MockProvider(BsToastService),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BsToastContainerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
