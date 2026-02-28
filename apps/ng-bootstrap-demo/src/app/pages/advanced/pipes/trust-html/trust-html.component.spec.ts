import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MockPipe, MockComponent, MockDirective } from 'ng-mocks';
import { BsTrustHtmlPipe } from '@mintplayer/ng-bootstrap/trust-html';

import { TrustHtmlComponent } from './trust-html.component';
import { BsFormComponent, BsFormGroupDirective, BsFormControlDirective } from '@mintplayer/ng-bootstrap/form';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsColFormLabelDirective } from '@mintplayer/ng-bootstrap/grid';

describe('TrustHtmlComponent', () => {
  let component: TrustHtmlComponent;
  let fixture: ComponentFixture<TrustHtmlComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        FormsModule,
        MockComponent(BsFormComponent), MockDirective(BsFormGroupDirective), MockDirective(BsFormControlDirective),
        MockComponent(BsGridComponent), MockDirective(BsGridRowDirective), MockDirective(BsGridColumnDirective), MockDirective(BsColFormLabelDirective),
        MockPipe(BsTrustHtmlPipe),
        TrustHtmlComponent,
      ]
    });
    fixture = TestBed.createComponent(TrustHtmlComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
