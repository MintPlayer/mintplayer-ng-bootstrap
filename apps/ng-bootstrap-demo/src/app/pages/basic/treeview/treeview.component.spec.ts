import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { TreeviewComponent } from './treeview.component';
import { MockComponent } from 'ng-mocks';
import { BsTreeviewComponent, BsTreeviewItemComponent } from '@mintplayer/ng-bootstrap/treeview';

describe('TreeviewComponent', () => {
  let component: TreeviewComponent;
  let fixture: ComponentFixture<TreeviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        MockComponent(BsTreeviewComponent), MockComponent(BsTreeviewItemComponent),
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
