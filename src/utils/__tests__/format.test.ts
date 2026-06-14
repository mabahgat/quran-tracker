import { directionalArrow, directionalChevron } from '../format';

describe('directional glyph helpers', () => {
  const LTR_ISOLATE = '\u2066';
  const POP_DIRECTIONAL_ISOLATE = '\u2069';

  it('returns isolated arrows to avoid RTL auto-mirroring', () => {
    expect(directionalArrow(false)).toBe(`${LTR_ISOLATE}→${POP_DIRECTIONAL_ISOLATE}`);
    expect(directionalArrow(true)).toBe(`${LTR_ISOLATE}←${POP_DIRECTIONAL_ISOLATE}`);
  });

  it('returns isolated chevrons to avoid RTL auto-mirroring', () => {
    expect(directionalChevron(false)).toBe(`${LTR_ISOLATE}›${POP_DIRECTIONAL_ISOLATE}`);
    expect(directionalChevron(true)).toBe(`${LTR_ISOLATE}‹${POP_DIRECTIONAL_ISOLATE}`);
  });
});
