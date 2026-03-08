import { useState, useRef, useCallback, useEffect, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PanelPosition = 'left' | 'right' | 'top' | 'bottom';

interface WorkspacePanelProps {
  position: PanelPosition;
  collapsed: boolean;
  onToggle: () => void;
  size: number;
  onResize: (size: number) => void;
  children: ReactNode;
  className?: string;
}

const MIN_SIZE = 180;
const MAX_HORIZONTAL = 480;
const MAX_VERTICAL = 360;

const slideVariants: Record<PanelPosition, { hidden: Record<string, number>; visible: Record<string, number> }> = {
  left: { hidden: { x: '-100%', opacity: 0 }, visible: { x: 0, opacity: 1 } },
  right: { hidden: { x: '100%', opacity: 0 }, visible: { x: 0, opacity: 1 } },
  top: { hidden: { y: '-100%', opacity: 0 }, visible: { y: 0, opacity: 1 } },
  bottom: { hidden: { y: '100%', opacity: 0 }, visible: { y: 0, opacity: 1 } },
};

export function WorkspacePanel({ position, collapsed, onToggle, size, onResize, children, className }: WorkspacePanelProps) {
  const isHorizontal = position === 'left' || position === 'right';
  const dragRef = useRef<{ startPos: number; startSize: number } | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = {
      startPos: isHorizontal ? e.clientX : e.clientY,
      startSize: size,
    };

    const handleMouseMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const delta = isHorizontal
        ? (position === 'left' ? ev.clientX - dragRef.current.startPos : dragRef.current.startPos - ev.clientX)
        : (position === 'top' ? ev.clientY - dragRef.current.startPos : dragRef.current.startPos - ev.clientY);
      const maxSize = isHorizontal ? MAX_HORIZONTAL : MAX_VERTICAL;
      onResize(Math.max(MIN_SIZE, Math.min(maxSize, dragRef.current.startSize + delta)));
    };

    const handleMouseUp = () => {
      dragRef.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [isHorizontal, position, size, onResize]);

  const CollapseIcon = position === 'left' ? (collapsed ? ChevronRight : ChevronLeft)
    : position === 'right' ? (collapsed ? ChevronLeft : ChevronRight)
    : position === 'top' ? (collapsed ? ChevronDown : ChevronUp)
    : (collapsed ? ChevronUp : ChevronDown);

  const resizeBarClass = isHorizontal
    ? 'w-1.5 cursor-col-resize hover:bg-primary/30 active:bg-primary/50 transition-colors'
    : 'h-1.5 cursor-row-resize hover:bg-primary/30 active:bg-primary/50 transition-colors';

  const resizeBarPosition = position === 'left' ? 'right-0 top-0 bottom-0'
    : position === 'right' ? 'left-0 top-0 bottom-0'
    : position === 'top' ? 'bottom-0 left-0 right-0'
    : 'top-0 left-0 right-0';

  return (
    <div className={cn('relative flex-shrink-0', className)} style={isHorizontal ? { width: collapsed ? 0 : size } : { height: collapsed ? 0 : size }}>
      {/* Collapse toggle button */}
      <button
        onClick={onToggle}
        className={cn(
          'absolute z-20 flex items-center justify-center rounded-md bg-muted border border-border shadow-sm hover:bg-accent transition-colors',
          isHorizontal ? 'w-5 h-8 top-2' : 'h-5 w-8 left-2',
          position === 'left' && (collapsed ? '-right-6' : '-right-3'),
          position === 'right' && (collapsed ? '-left-6' : '-left-3'),
          position === 'top' && (collapsed ? '-bottom-6' : '-bottom-3'),
          position === 'bottom' && (collapsed ? '-top-6' : '-top-3'),
        )}
      >
        <CollapseIcon className="h-3 w-3 text-muted-foreground" />
      </button>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={slideVariants[position].hidden}
            animate={slideVariants[position].visible}
            exit={slideVariants[position].hidden}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={cn(
              'h-full w-full overflow-hidden bg-card border-border rounded-lg border',
              isHorizontal ? 'flex flex-col' : ''
            )}
          >
            <div className="flex-1 overflow-auto p-3">
              {children}
            </div>

            {/* Resize handle */}
            <div
              className={cn('absolute', resizeBarClass, resizeBarPosition)}
              onMouseDown={handleMouseDown}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
