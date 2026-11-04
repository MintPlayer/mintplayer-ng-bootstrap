// S3: does jsdom (nwsapi) match the anchored guard?
import { createRequire } from 'node:module';
const require = createRequire('C:/Repos/mintplayer-ng-bootstrap/package.json');
const { JSDOM } = require('jsdom');
console.log('jsdom', require('jsdom/package.json').version);

const html = `
<div data-mps="shell" class="content">
  <label class="form-label" id="in-shell">x</label>
  <bs-form><form data-mps="form">
    <label class="form-label" id="in-form">x</label>
    <div><div><span class="form-text" id="deep-in-form">x</span></div></div>
  </form></bs-form>
  <label class="form-label" data-mps="select" id="self">x</label>
  <div class="input-group" data-mps="input-group"><span class="input-group-text" id="in-ig">@</span></div>
  <table class="table" data-mps="table"><tbody><tr class="table-active" id="tr"><td class="table-primary" id="td">x</td></tr></tbody></table>
  <table class="table table-primary" data-mps="table" id="table-self"></table>
</div>
<form><label class="form-label" id="raw-form">x</label></form>`;
const doc = new JSDOM(html).window.document;

const cases = [
  ['.form-label:where([data-mps], form[data-mps] *, .input-group[data-mps] *, .form-floating[data-mps] *)', ['in-form', 'self']],
  ['.form-text:where([data-mps], form[data-mps] *)', ['deep-in-form']],
  ['.input-group-text:where([data-mps], form[data-mps] *, .input-group[data-mps] *)', ['in-ig']],
  ['.table-active:where([data-mps], .table[data-mps] *)', ['tr']],
  ['.table-primary:where([data-mps], .table[data-mps] *)', ['td', 'table-self']],
  ['.form-label:where([data-mps], :is(form, .input-group, .form-floating)[data-mps] *)', ['in-form', 'self']],
];
let fail = 0;
for (const [sel, want] of cases) {
  let got;
  try { got = [...doc.querySelectorAll(sel)].map((e) => e.id); } catch (e) { got = ['THROW ' + e.message]; }
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fail++;
  console.log(ok ? 'OK  ' : 'FAIL', sel, '=>', got.join(','));
}
console.log(fail ? `${fail} failing` : 'all pass');
