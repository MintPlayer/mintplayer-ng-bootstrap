import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { TreeviewComponent } from './treeview.component';
import { MockModule } from 'ng-mocks';
import { BsTreeviewModule } from '@mintplayer/ng-bootstrap/treeview';

describe('TreeviewComponent', () => {
  let component: TreeviewComponent;
  let fixture: ComponentFixture<TreeviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        MockModule(BsTreeviewModule),
        TreeviewComponent,
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
