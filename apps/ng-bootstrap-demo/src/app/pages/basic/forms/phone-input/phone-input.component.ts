import { JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, model, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsGridColDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsFormComponent } from '@mintplayer/ng-bootstrap/form';
import { BsInputGroupComponent } from '@mintplayer/ng-bootstrap/input-group';
import { BsPhoneInputComponent } from '@mintplayer/ng-bootstrap/phone-input';
import { BsSelectComponent } from '@mintplayer/ng-bootstrap/select';
import { BsCheckboxComponent } from '@mintplayer/ng-bootstrap/checkbox';
import type { PhoneChangeEventDetail } from '@mintplayer/web-components/phone-input';
import { dedent } from 'ts-dedent';

@Component({
  selector: 'demo-phone-input',
  templateUrl: './phone-input.component.html',
  imports: [
    JsonPipe,
    FormsModule,
    BsCodeSnippetComponent,
    BsGridComponent,
    BsGridRowDirective,
    BsGridColumnDirective,
    BsGridColDirective,
    BsFormComponent,
    BsInputGroupComponent,
    BsPhoneInputComponent,
    BsSelectComponent,
    BsCheckboxComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PhoneInputComponent {
  readonly phone = model<string | null>(null);
  readonly disabled = model(false);
  readonly required = model(false);
  /** '' means "use the browser's locale", which is the component's default. */
  readonly locale = model<string>('');
  readonly lastDetail = signal<PhoneChangeEventDetail | null>(null);

  readonly restricted = model<string | null>(null);
  readonly benelux = ['be', 'nl', 'lu'];

  readonly grouped = model<string | null>(null);

  protected readonly errorMessages = { required: 'A phone number is required.' };

  onPhoneChange(detail: PhoneChangeEventDetail): void {
    this.lastDetail.set(detail);
  }

  protected readonly snippetBasicHtml = dedent`
    <bs-form>
      <bs-phone-input [(ngModel)]="phone" name="phone"
                      defaultCountry="be"
                      (phoneChange)="onPhoneChange($event)" />
    </bs-form>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component, model } from '@angular/core';
    import { FormsModule } from '@angular/forms';
    import { BsFormComponent } from '@mintplayer/ng-bootstrap/form';
    import { BsPhoneInputComponent } from '@mintplayer/ng-bootstrap/phone-input';
    import type { PhoneChangeEventDetail } from '@mintplayer/web-components/phone-input';

    @Component({
      selector: 'my-phone-demo',
      templateUrl: './my-phone-demo.component.html',
      imports: [FormsModule, BsFormComponent, BsPhoneInputComponent],
    })
    export class MyPhoneDemoComponent {
      // The bound value is E.164 — '+32470123456' — or null while empty.
      readonly phone = model<string | null>(null);

      onPhoneChange(detail: PhoneChangeEventDetail) {
        // detail.valid is undefined until the country's rules have loaded.
        console.log(detail.country, detail.nationalNumber, detail.valid);
      }
    }
  `;

  protected readonly snippetRestrictedHtml = dedent`
    <!-- allowed-countries, NOT only-countries: Angular refuses to bind any
         attribute whose name starts with 'on'. -->
    <bs-phone-input [(ngModel)]="phone"
                    [allowedCountries]="['be', 'nl', 'lu']"
                    [preferredCountries]="['nl']"
                    defaultCountry="nl" />
  `;

  protected readonly snippetGroupHtml = dedent`
    <!-- bs-input-group joins any mix of controls, including ones that keep
         their own shadow root: the corners pair and the borders collapse.
         Below ~6rem per control the row wraps instead of crushing them;
         override --mp-group-min-item-width for a denser toolbar. -->
    <bs-input-group>
      <span class="addon">Tel</span>
      <bs-phone-input [(ngModel)]="phone" defaultCountry="be" />
    </bs-input-group>
  `;

  protected readonly snippetValidationTs = dedent`
    // error-text is mirrored inward by BsControlValidityDirective, which the
    // wrapper applies automatically — the message is rendered INSIDE the
    // component's shadow root and referenced by aria-errormessage, because an
    // IDREF from the real input cannot reach a node in your template.
    <bs-phone-input [(ngModel)]="phone" name="phone" required
                    [errorMessages]="{ required: 'A phone number is required.' }" />
  `;
}
