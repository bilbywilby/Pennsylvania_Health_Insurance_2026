import { useMemo } from 'react';
import { RATING_AREAS, RatingAreaData } from '@/data/ratingAreas';
import { Logger } from '@/lib/logger';
export function useRatingArea(id: string | undefined): RatingAreaData | null {
  return useMemo(() => {
    if (!id) return null;
    const area = RATING_AREAS.find(a => a.id === id);
    if (!area) {
      Logger.warn(`Access attempted for non-existent Rating Area ID: ${id}`, 'useRatingArea');
      return null;
    }
    return area;
  }, [id]);
}