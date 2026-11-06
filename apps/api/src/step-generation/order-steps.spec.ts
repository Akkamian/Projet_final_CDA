import { orderSteps, type GeneratedStep } from './order-steps.js';

const step = (label: string, stepOrder: number, complicationCode: string | null = null): GeneratedStep => ({
  label,
  stepOrder,
  complicationCode,
  complicationLabel: complicationCode ? `Libellé ${complicationCode}` : null,
});

describe('orderSteps', () => {
  it('RG-ETP-04 trie par rang croissant', () => {
    const result = orderSteps([step('c', 300), step('a', 100), step('b', 200)]);
    expect(result.map((s) => s.label)).toEqual(['a', 'b', 'c']);
  });

  it('RG-ETP-04 à rang égal, l’étape de base précède celle d’une complication', () => {
    const result = orderSteps([step('chrono', 400, 'chronograph'), step('base', 400)]);
    expect(result.map((s) => s.label)).toEqual(['base', 'chrono']);
  });

  it('RG-ETP-04 à rang égal entre complications, l’ordre suit le code de la complication', () => {
    const result = orderSteps([step('jour', 420, 'day_date'), step('date', 420, 'date'), step('base', 420)]);
    expect(result.map((s) => s.label)).toEqual(['base', 'date', 'jour']);
  });

  it('ne modifie pas le tableau reçu', () => {
    const input = [step('b', 200), step('a', 100)];
    orderSteps(input);
    expect(input.map((s) => s.label)).toEqual(['b', 'a']);
  });
});
