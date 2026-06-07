import {
  clampVerses,
  cumulativeIndexOf,
  getSurah,
  isValidPosition,
  lastMemorizedPosition,
  nextPosition,
  positionAtIndex,
  TOTAL_AYAH,
  versesToReachPosition,
} from '../quran';
import { SURAHS } from '../quranData';

describe('quran dataset', () => {
  it('contains all 114 surahs in order', () => {
    expect(SURAHS).toHaveLength(114);
    SURAHS.forEach((surah, index) => {
      expect(surah.number).toBe(index + 1);
      expect(surah.ayahCount).toBeGreaterThan(0);
      expect(surah.nameAr.length).toBeGreaterThan(0);
      expect(surah.nameEn.length).toBeGreaterThan(0);
    });
  });

  it('has a canonical total of 6236 ayat', () => {
    expect(TOTAL_AYAH).toBe(6236);
  });
});

describe('position math', () => {
  it('maps the first ayah', () => {
    expect(positionAtIndex(1)).toEqual({ surah: 1, ayah: 1 });
    expect(cumulativeIndexOf({ surah: 1, ayah: 1 })).toBe(1);
  });

  it('maps the boundary between Al-Fatihah and Al-Baqarah', () => {
    expect(positionAtIndex(7)).toEqual({ surah: 1, ayah: 7 });
    expect(positionAtIndex(8)).toEqual({ surah: 2, ayah: 1 });
    expect(cumulativeIndexOf({ surah: 2, ayah: 1 })).toBe(8);
  });

  it('maps the final ayah', () => {
    expect(positionAtIndex(TOTAL_AYAH)).toEqual({ surah: 114, ayah: 6 });
    expect(cumulativeIndexOf({ surah: 114, ayah: 6 })).toBe(TOTAL_AYAH);
  });

  it('round-trips every surah boundary', () => {
    for (let index = 1; index <= TOTAL_AYAH; index += 137) {
      expect(cumulativeIndexOf(positionAtIndex(index))).toBe(index);
    }
    for (const surah of SURAHS) {
      const start = cumulativeIndexOf({ surah: surah.number, ayah: 1 });
      expect(positionAtIndex(start)).toEqual({ surah: surah.number, ayah: 1 });
      const end = cumulativeIndexOf({ surah: surah.number, ayah: surah.ayahCount });
      expect(positionAtIndex(end)).toEqual({ surah: surah.number, ayah: surah.ayahCount });
    }
  });
});

describe('verse clamping', () => {
  it('clamps out-of-range values', () => {
    expect(clampVerses(-5)).toBe(0);
    expect(clampVerses(10.9)).toBe(10);
    expect(clampVerses(99999)).toBe(TOTAL_AYAH);
    expect(clampVerses(NaN)).toBe(0);
  });
});

describe('last / next position', () => {
  it('returns null before anything is memorized', () => {
    expect(lastMemorizedPosition(0)).toBeNull();
    expect(nextPosition(0)).toEqual({ surah: 1, ayah: 1 });
  });

  it('tracks progress through Al-Fatihah', () => {
    expect(lastMemorizedPosition(7)).toEqual({ surah: 1, ayah: 7 });
    expect(nextPosition(7)).toEqual({ surah: 2, ayah: 1 });
  });

  it('handles completion', () => {
    expect(lastMemorizedPosition(TOTAL_AYAH)).toEqual({ surah: 114, ayah: 6 });
    expect(nextPosition(TOTAL_AYAH)).toBeNull();
  });
});

describe('isValidPosition', () => {
  it('accepts valid positions', () => {
    expect(isValidPosition({ surah: 1, ayah: 1 })).toBe(true);
    expect(isValidPosition({ surah: 2, ayah: 286 })).toBe(true);
    expect(isValidPosition({ surah: 114, ayah: 6 })).toBe(true);
  });

  it('rejects out-of-range ayat and surahs', () => {
    expect(isValidPosition({ surah: 1, ayah: 8 })).toBe(false);
    expect(isValidPosition({ surah: 0, ayah: 1 })).toBe(false);
    expect(isValidPosition({ surah: 115, ayah: 1 })).toBe(false);
    expect(isValidPosition({ surah: 2, ayah: 0 })).toBe(false);
    expect(isValidPosition({ surah: 2, ayah: 1.5 })).toBe(false);
  });
});

describe('versesToReachPosition', () => {
  it('computes the delta from an already-memorized count', () => {
    // Reaching 2:56 (global index 63) from 0 memorized = 63 verses.
    expect(versesToReachPosition({ surah: 2, ayah: 56 }, 0)).toBe(63);
    // From 63 already memorized, reaching 2:76 (index 83) = 20 more.
    expect(versesToReachPosition({ surah: 2, ayah: 76 }, 63)).toBe(20);
  });

  it('is negative when the position is behind current progress', () => {
    expect(versesToReachPosition({ surah: 1, ayah: 1 }, 100)).toBeLessThan(0);
  });
});

describe('getSurah', () => {
  it('returns surah metadata', () => {
    expect(getSurah(1).nameEn).toBe('Al-Fatihah');
    expect(getSurah(114).ayahCount).toBe(6);
  });

  it('throws on invalid numbers', () => {
    expect(() => getSurah(0)).toThrow();
    expect(() => getSurah(115)).toThrow();
  });
});
