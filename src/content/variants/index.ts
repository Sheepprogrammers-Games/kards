/**
 * 卡牌的另一种写法。开局按种子为每张牌抽定一版，整局不再变化。
 * 立绘、名字、类别与稀有度都不随版本改变，只改写费用与结算内容。
 */

import type { CardVariant } from '@engine/types';
import { WEAVE_VARIANTS } from './weave';
import { IGNITE_VARIANTS } from './ignite';
import { DISRUPT_VARIANTS } from './disrupt';

export const VARIANTS: Record<string, CardVariant[]> = {
  ...WEAVE_VARIANTS,
  ...IGNITE_VARIANTS,
  ...DISRUPT_VARIANTS,
};
