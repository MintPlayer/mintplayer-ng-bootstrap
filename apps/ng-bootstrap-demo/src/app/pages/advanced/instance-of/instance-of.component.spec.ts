import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { BsInstanceOfModule } from '@mintplayer/ng-bootstrap/instance-of';
import { MockModule } from 'ng-mocks';

import { InstanceOfComponent } from './instance-of.component';

describe('InstanceOfComponent', () => {
  let component: InstanceOfComponent;
  let fixture: ComponentFixture<InstanceOfComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockModule(BsInstanceOfModule),
        InstanceOfComponent,
      ],
      providers: [
        provideNoopAnimations(),
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(InstanceOfComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
