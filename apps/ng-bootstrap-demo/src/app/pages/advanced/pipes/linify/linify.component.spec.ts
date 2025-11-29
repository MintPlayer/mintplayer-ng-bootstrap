import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { BsFormModule } from '@mintplayer/ng-bootstrap/form';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsLinifyPipe } from '@mintplayer/ng-bootstrap/linify';
import { BsListGroupModule } from '@mintplayer/ng-bootstrap/list-group';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsToggleButtonModule } from '@mintplayer/ng-bootstrap/toggle-button';
import { MockDirective, MockModule, MockPipe } from 'ng-mocks';

import { LinifyComponent } from './linify.component';

describe('LinifyComponent', () => {
  let component: LinifyComponent;
  let fixture: ComponentFixture<LinifyComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        FormsModule,
        MockModule(BsFormModule),
        MockModule(BsGridModule),
        MockPipe(BsLinifyPipe),
        MockModule(BsListGroupModule),
        MockDirective(BsButtonTypeDirective),
        MockModule(BsToggleButtonModule),

        // Unit to test (standalone)
        LinifyComponent,
      ]
    });
    fixture = TestBed.createComponent(LinifyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
