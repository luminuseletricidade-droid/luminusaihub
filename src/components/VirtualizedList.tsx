import React, { memo, useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';

interface VirtualizedListProps<T> {
  items: T[];
  height: number;
  itemHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  overscan?: number;
}

function VirtualizedList<T>({
  items,
  height,
  itemHeight,
  renderItem,
  className = '',
  overscan = 5
}: VirtualizedListProps<T>) {
  const Row = memo(({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      {renderItem(items[index], index)}
    </div>
  ));

  Row.displayName = 'VirtualizedRow';

  const memoizedItems = useMemo(() => items, [items]);

  if (memoizedItems.length === 0) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height }}>
        <p className="text-muted-foreground">Nenhum item encontrado</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <List
        height={height}
        itemCount={memoizedItems.length}
        itemSize={itemHeight}
        overscanCount={overscan}
        width="100%"
      >
        {Row}
      </List>
    </div>
  );
}

export default memo(VirtualizedList) as typeof VirtualizedList;