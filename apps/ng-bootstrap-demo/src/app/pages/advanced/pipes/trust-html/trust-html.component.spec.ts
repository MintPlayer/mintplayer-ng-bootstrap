import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MockModule, MockPipe } from 'ng-mocks';
import { BsFormModule } from '@mintplayer/ng-bootstrap/form';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsTrustHtmlPipe } from '@mintplayer/ng-bootstrap/trust-html';

import { TrustHtmlComponent } from './trust-html.component';

describe('TrustHtmlComponent', () => {
  let component: TrustHtmlComponent;
  let fixture: ComponentFixture<TrustHtmlComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        FormsModule,
        MockModule(BsFormModule),
        MockModule(BsGridModule),
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
