import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TreeviewComponent } from './treeview.component';
import { MockModule, MockPipe } from 'ng-mocks';
import { BsTreeviewModule } from '@mintplayer/ng-bootstrap/treeview';
import { BsIconPipe } from '@mintplayer/ng-bootstrap/icon';

describe('TreeviewComponent', () => {
  let component: TreeviewComponent;
  let fixture: ComponentFixture<TreeviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockModule(BsTreeviewModule),
      ],
      declarations: [
        MockPipe(BsIconPipe),
        TreeviewComponent
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TreeviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
