import { JsonPipe } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { MockModule } from 'ng-mocks';
import { BsNavbarModule } from '@mintplayer/ng-bootstrap/navbar';
import { AppComponent } from './app.component';
import { BOOTSTRAP_VERSION } from './providers/bootstrap-version.provider';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        HttpClientModule,
        RouterTestingModule.withRoutes([
          { path: 'a/b/c', component: PageAbcComponent }
        ]),

        // Mock dependencies
        MockModule(BsNavbarModule),

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
  standalone: true,
  template: 'Page ABC',
})
class PageAbcComponent {
}
