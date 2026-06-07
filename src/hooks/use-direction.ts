import { useTranslation } from 'react-i18next';

import { isRTL } from '@/i18n';

type Align = 'left' | 'right';
type FlexRow = 'row' | 'row-reverse';

export interface DirectionInfo {
  isRTL: boolean;
  language: string;
  textAlign: Align;
  startAlign: Align;
  flexRow: FlexRow;
}

/** Direction-aware helpers derived from the active language, so text alignment
 *  and row order flip immediately when the language changes. */
export function useDirection(): DirectionInfo {
  const { i18n } = useTranslation();
  const rtl = isRTL(i18n.language);
  return {
    isRTL: rtl,
    language: i18n.language,
    textAlign: rtl ? 'right' : 'left',
    startAlign: rtl ? 'right' : 'left',
    flexRow: rtl ? 'row-reverse' : 'row',
  };
}

