import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResizableComponent } from './resizable.component';
import { MockModule } from 'ng-mocks';
import { BsResizableModule } from '@mintplayer/ng-bootstrap/resizable';

describe('ResizableComponent', () => {
  let component: ResizableComponent;
  let fixture: ComponentFixture<ResizableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockModule(BsResizableModule)
      ],
      declarations: [ ResizableComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ResizableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
