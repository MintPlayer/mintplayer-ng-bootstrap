import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockComponent, MockProvider } from 'ng-mocks';
import { BsToastContainerComponent } from './toast-container.component';
import { BsOverlayComponent } from '@mintplayer/ng-bootstrap/overlay';
import { BsToastService } from '../../services/toast/toast.service';

describe('BsToastContainerComponent', () => {
  let component: BsToastContainerComponent;
  let fixture: ComponentFixture<BsToastContainerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockComponent(BsOverlayComponent),
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
