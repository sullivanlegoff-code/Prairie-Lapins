// @vitest-environment happy-dom
import {describe, expect, it} from 'vitest';
import {currencyAccessibleText, setCurrencyText} from '../src/display/currency';
describe('currency presentation without changing transaction data',()=>{
 it('keeps signs, grouped amounts, stocks and hourly units with accessible icons',()=>{
  const host=document.createElement('p');
  setCurrencyText(host,'+1234567 pattes · 250 / 600 pattes · 14 pattes / h · 0 patte + 2 cœurs');
  expect(host.textContent).toBe('+1\u202f234\u202f567 pièces · 250 / 600 pièces · 14 pièces / h · 0 pièces + 2 cœurs');
  expect(host.querySelectorAll('.coin-amount')).toHaveLength(4);
  expect([...host.querySelectorAll('img')].every(i=>i.alt===''&&i.getAttribute('aria-hidden')==='true')).toBe(true);
  expect(currencyAccessibleText('-1000 pattes')).toBe('-1\u202f000 pièces');
 });
 it('renders imported text as text, replaces singular/generic currency and refreshes without duplicating images',()=>{
  const host=document.createElement('p');setCurrencyText(host,'<script>non exécuté</script> Pattes disponibles : 1 patte');
  expect(host.querySelector('script')).toBeNull();expect(host.querySelectorAll('img')).toHaveLength(2);
  expect(host.textContent).toBe('<script>non exécuté</script> pièces disponibles : 1 pièces');
  setCurrencyText(host,'Vendre pour 40 pattes ?');expect(host.querySelectorAll('img')).toHaveLength(1);
  expect(host.textContent).toBe('Vendre pour 40 pièces ?');
 });
});
