import { JsonPipe } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { BsNavbarTestingModule } from '@mintplayer/ng-bootstrap/testing';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        HttpClientModule,
        BsNavbarTestingModule,
        RouterTestingModule.withRoutes([
          { path: 'a/b/c', component: PageAbcComponent }
        ]),
      ],
      declarations: [
        // Component to test
        AppComponent,
      
        // Mock pages
        PageAbcComponent
      ],
      providers: [
        JsonPipe,
        { provide: 'BOOTSTRAP_VERSION', useValue: '0.0.0' }
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
  template: 'Page ABC'
})
class PageAbcComponent {
}
