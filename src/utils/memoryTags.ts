import { Memory, POPULAR_TAGS } from '../types';

export const MAX_TAGS_PER_MEMORY = 5;
export const MAX_TAG_LENGTH = 24;

export const PRESET_MEMORY_TAGS: string[] = POPULAR_TAGS.filter((t) => t !== 'Tất cả');

export const FEATURED_FILTER_TAGS = ['Du lịch', 'Hẹn hò', 'Ngày lễ'] as const;

export function normalizeTagName(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const cleaned = raw
    .replace(/^#+/, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return '';
  return cleaned.slice(0, MAX_TAG_LENGTH);
}

export function dedupeTags(tags: unknown[]): string[] {
  if (!Array.isArray(tags)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of tags) {
    const normalized = normalizeTagName(raw);
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
  }
  return result;
}

/**
 * Lấy danh sách thẻ đã chuẩn hóa của 1 kỷ niệm (tương thích ngược hoàn toàn với trường `tag` đơn cũ).
 */
export function getMemoryTags(memory?: Pick<Memory, 'tag' | 'tags'> | null): string[] {
  if (!memory) return ['Kỷ niệm'];
  const combined: unknown[] = [];
  if (Array.isArray(memory.tags)) {
    combined.push(...memory.tags);
  }
  if (typeof memory.tag === 'string' && memory.tag.trim()) {
    combined.push(memory.tag);
  }
  const unique = dedupeTags(combined);
  return unique.length > 0 ? unique : ['Kỷ niệm'];
}

export function memoryHasTag(memory: Pick<Memory, 'tag' | 'tags'>, targetTag: string): boolean {
  if (!targetTag || targetTag === 'Tất cả') return true;
  const targetKey = targetTag.trim().toLowerCase();
  return getMemoryTags(memory).some((t) => t.toLowerCase() === targetKey);
}

export interface TagStat {
  name: string;
  count: number;
  isCustom: boolean;
}

/**
 * Tổng hợp toàn bộ thẻ (preset + thẻ tùy chỉnh của người dùng) kèm số lượng kỷ niệm thực tế.
 */
export function buildTagFilterStats(memories: Memory[]): TagStat[] {
  const countMap = new Map<string, { label: string; count: number }>();

  for (const mem of memories) {
    const memTags = getMemoryTags(mem);
    for (const tag of memTags) {
      const key = tag.toLowerCase();
      const existing = countMap.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        countMap.set(key, { label: tag, count: 1 });
      }
    }
  }

  const presetKeys = new Set(PRESET_MEMORY_TAGS.map((t) => t.toLowerCase()));
  const presetStats: TagStat[] = PRESET_MEMORY_TAGS.map((name) => ({
    name,
    count: countMap.get(name.toLowerCase())?.count || 0,
    isCustom: false
  }));

  const customStats: TagStat[] = [];
  for (const [key, entry] of countMap.entries()) {
    if (!presetKeys.has(key)) {
      customStats.push({
        name: entry.label,
        count: entry.count,
        isCustom: true
      });
    }
  }

  customStats.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'vi'));

  return [...presetStats, ...customStats];
}
