/**
 * Drag & Drop data protocol for the circuit editor.
 *
 * Defines the data shapes attached to draggable/droppable elements
 * so CircuitDndProvider can route events correctly.
 */

import type { Formula, TripDay } from '@/lib/api/types';

// ============================================================================
// Drag source data (attached via useSortable/useDraggable `data` option)
// ============================================================================

/** Block being dragged within the same circuit (inter-day move) */
export interface IntraBlockDragData {
  type: 'block';
  block: Formula;
  dayId: number;
}

/** Block dragged from the source panel (copy from template/circuit) */
export interface SourceBlockDragData {
  type: 'source-block';
  block: Formula;
  sourceDayId: number;
}

/** Day card being reordered within the same circuit */
export interface IntraDayDragData {
  type: 'circuit-day';
  day: TripDay;
  tripId: number;
}

/** Entire day dragged from the source panel (copy all blocks) */
export interface SourceDayDragData {
  type: 'source-day';
  day: TripDay;
  sourceTripId: number;
}

export type DragData = IntraBlockDragData | SourceBlockDragData | IntraDayDragData | SourceDayDragData;

// ============================================================================
// Drop target data (attached via useDroppable `data` option)
// ============================================================================

/** A day card — droppable zone for blocks */
export interface DayDropData {
  type: 'day';
  dayId: number;
  dayNumber: number;
}

export type DropData = DayDropData;
