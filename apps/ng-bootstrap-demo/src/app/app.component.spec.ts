import { JsonPipe } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { MockComponent, MockDirective } from 'ng-mocks';
import { AppComponent } from './app.component';
import { BOOTSTRAP_VERSION } from './providers/bootstrap-version.provider';
import { BsNavbarComponent, BsNavbarBrandComponent, BsNavbarNavComponent, BsNavbarDropdownComponent, BsNavbarItemComponent, BsNavbarContentDirective, BsExpandButtonDirective } from '@mintplayer/ng-bootstrap/navbar';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        HttpClientModule,
        RouterTestingModule.withRoutes([
          { path: 'a/b/c', component: PageAbcComponent }
        ]),

        // Mock dependencies
        MockComponent(BsNavbarComponent), MockComponent(BsNavbarBrandComponent), MockComponent(BsNavbarNavComponent), MockComponent(BsNavbarDropdownComponent), MockComponent(BsNavbarItemComponent), MockDirective(BsNavbarContentDirective), MockDirective(BsExpandButtonDirective),

        // Component to test (standalone)
        AppComponent,

        // Mock pages (standalone)
        PageAbcComponent
      ],
      providers: [
        JsonPipe,
        { provide: BOOTSTRAP_VERSION, useValue: '0.0.0' }
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

});

@Component({
  selector: 'a-b-c',
  template: 'Page ABC',
})
class PageAbcComponent {
}
