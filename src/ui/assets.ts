/** 图像资源查表。构建时由打包器解析为最终 URL。 */

type UrlMap = Record<string, string>;

const cards = import.meta.glob('../../assets/art/card/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
}) as UrlMap;

const enemies = import.meta.glob('../../assets/art/enemy/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
}) as UrlMap;

const relics = import.meta.glob('../../assets/art/relic/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
}) as UrlMap;

const equipment = import.meta.glob('../../assets/art/equipment/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
}) as UrlMap;

const intents = import.meta.glob('../../assets/art/intent/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
}) as UrlMap;

const backgrounds = import.meta.glob('../../assets/art/bg/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
}) as UrlMap;

const ui = import.meta.glob('../../assets/art/ui/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
}) as UrlMap;

function pick(map: UrlMap, name: string): string | null {
  for (const [path, url] of Object.entries(map)) {
    if (path.endsWith(`/${name}.webp`)) return url;
  }
  return null;
}

export const art = {
  card: (id: string) => pick(cards, id),
  enemy: (id: string) => pick(enemies, id),
  intent: (id: string) => pick(intents, id),
  relic: (id: string) => pick(relics, id),
  equipment: (id: string) => pick(equipment, id),
  bg: (id: string) => pick(backgrounds, id),
  ui: (id: string) => pick(ui, id),
};
