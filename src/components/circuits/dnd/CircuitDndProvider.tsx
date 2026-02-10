'use client';

import { useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
  rectIntersection,
  type DragStartEvent,
  type DragEndEvent,
  type CollisionDetection,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { DragPreview } from './DragPreview';
import type { DragData, DayDropData, IntraBlockDragData, IntraDayDragData } from './types';

interface CircuitDndProviderProps {
  /** Move a block to another day (intra-circuit) */
  onMoveBlock: (formulaId: number, targetDayId: number) => Promise<void>;
  /** Reorder blocks within the same day */
  onReorderBlocks: (dayId: number, blockIds: number[]) => Promise<void>;
  /** Reorder days within the circuit */
  onReorderDays: (dayIds: number[]) => Promise<void>;
  /** Copy a block from source panel to a day */
  onDuplicateBlock: (formulaId: number, targetDayId: number) => Promise<void>;
  /** Copy all blocks from a source day to a target day */
  onCopyDayBlocks: (sourceDayId: number, targetDayId: number) => Promise<void>;
  /** Map of dayId → sortable block ids (for reorder calculation) */
  dayBlocksMap: Map<number, number[]>;
  /** Ordered day IDs for the circuit (for day reorder calculation) */
  dayIds: number[];
  children: React.ReactNode;
}

/**
 * Single DndContext that wraps the entire Programme tab.
 * Handles ALL drag events:
 * - 'block' dropped on same-day 'block' → reorder within day
 * - 'block' dropped on 'day' (different day) → move inter-day
 * - 'circuit-day' dropped on another 'circuit-day' → reorder days
 * - 'source-block' dropped on 'day' → copy from template/circuit
 * - 'source-day' dropped on 'day' → copy all blocks from source day
 */
export function CircuitDndProvider({
  onMoveBlock,
  onReorderBlocks,
  onReorderDays,
  onDuplicateBlock,
  onCopyDayBlocks,
  dayBlocksMap,
  dayIds,
  children,
}: CircuitDndProviderProps) {
  const [activeDragData, setActiveDragData] = useState<DragData | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  // Custom collision detection: context-aware based on what's being dragged
  const customCollision: CollisionDetection = useCallback((args) => {
    // First try pointerWithin — precise for nested droppable containers
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) {
      // When dragging a day, prefer day-sort targets (not block or day-drop)
      const activeData = args.active?.data?.current as DragData | undefined;
      if (activeData?.type === 'circuit-day') {
        const daySortCollision = pointerCollisions.find(c => {
          const id = String(c.id);
          return id.startsWith('day-sort-');
        });
        if (daySortCollision) return [daySortCollision];
      }

      // When dragging a block, prefer block-level targets for intra-day reorder
      const blockCollision = pointerCollisions.find(c => {
        const data = c.data?.droppableContainer?.data?.current as Record<string, unknown> | undefined;
        return data?.type === 'block';
      });
      if (blockCollision) return [blockCollision];
      return pointerCollisions;
    }
    // Fallback to rectIntersection
    return rectIntersection(args);
  }, []);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current as DragData | undefined;
    if (data) {
      setActiveDragData(data);
    }
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    setActiveDragData(null);

    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeData = active.data.current as DragData | undefined;
    if (!activeData) return;

    const overData = over.data.current as (DayDropData | IntraBlockDragData | IntraDayDragData) | undefined;
    if (!overData) return;

    try {
      // Case 1: Intra-day reorder (block dropped on another block in the same day)
      if (activeData.type === 'block' && overData.type === 'block') {
        if (activeData.dayId === overData.dayId) {
          // Same day → reorder
          const dayId = activeData.dayId;
          const currentIds = dayBlocksMap.get(dayId) || [];
          const oldIndex = currentIds.indexOf(activeData.block.id);
          const newIndex = currentIds.indexOf(overData.block.id);
          if (oldIndex !== -1 && newIndex !== -1) {
            const reordered = arrayMove(currentIds, oldIndex, newIndex);
            await onReorderBlocks(dayId, reordered);
          }
          return;
        }
        // Different day block target — treat as inter-day move to that block's day
        await onMoveBlock(activeData.block.id, overData.dayId);
        return;
      }

      // Case 2: Block dropped on a day card
      if (activeData.type === 'block' && overData.type === 'day') {
        if (activeData.dayId === overData.dayId) return; // same day, no-op
        await onMoveBlock(activeData.block.id, overData.dayId);
        return;
      }

      // Case 3: Day reorder (circuit-day dropped on another circuit-day)
      if (activeData.type === 'circuit-day' && overData.type === 'circuit-day') {
        const activeDayId = activeData.day.id;
        const overDayId = overData.day.id;
        if (activeDayId === overDayId) return;

        const oldIndex = dayIds.indexOf(activeDayId);
        const newIndex = dayIds.indexOf(overDayId);
        if (oldIndex !== -1 && newIndex !== -1) {
          const reordered = arrayMove(dayIds, oldIndex, newIndex);
          await onReorderDays(reordered);
        }
        return;
      }

      // Case 4: Source block from panel → copy to day
      if (activeData.type === 'source-block' && overData.type === 'day') {
        await onDuplicateBlock(activeData.block.id, overData.dayId);
        return;
      }

      // Case 5: Source day from panel → copy all blocks to day
      if (activeData.type === 'source-day' && overData.type === 'day') {
        await onCopyDayBlocks(activeData.day.id, overData.dayId);
        return;
      }
    } catch (err: unknown) {
      const apiErr = err as { detail?: string; status?: number; message?: string };
      console.error('DnD operation failed:', apiErr?.detail || apiErr?.message || JSON.stringify(err));
    }
  }, [onMoveBlock, onReorderBlocks, onReorderDays, onDuplicateBlock, onCopyDayBlocks, dayBlocksMap, dayIds]);

  const handleDragCancel = useCallback(() => {
    setActiveDragData(null);
  }, []);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={customCollision}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {children}
      <DragOverlay dropAnimation={null}>
        {activeDragData && <DragPreview data={activeDragData} />}
      </DragOverlay>
    </DndContext>
  );
}
