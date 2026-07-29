/** 图鉴的已见记录。纯数据，读写落盘由界面负责。 */

export interface CodexState {
  cards: string[];
  enemies: string[];
  relics: string[];
  equipment: string[];
}

export function emptyCodex(): CodexState {
  return { cards: [], enemies: [], relics: [], equipment: [] };
}

/** 记下一条已见条目，已存在时原样返回。 */
export function markSeen(state: CodexState, kind: keyof CodexState, id: string): CodexState {
  const seen = state[kind];
  if (seen.includes(id)) return state;
  return { ...state, [kind]: [...seen, id] };
}
