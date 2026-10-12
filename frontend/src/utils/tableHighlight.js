import { useState, useCallback } from 'react';

export function useTableHover() {
  const [hoveredCell, setHoveredCell] = useState({ row: null, col: null });

  const clearHover = useCallback(() => {
    setHoveredCell({ row: null, col: null });
  }, []);

  const hoverHeader = useCallback((colKey) => {
    setHoveredCell({ row: null, col: colKey });
  }, []);

  const hoverCell = useCallback((rowIdx, colKey) => {
    setHoveredCell({ row: rowIdx, col: colKey });
  }, []);

  const getCellBg = useCallback((rowIdx, colKey, defaultBg = '') => {
    const isRow = hoveredCell.row === rowIdx;
    const isCol = hoveredCell.col === colKey;
    if (isRow && isCol) return 'bg-blue-100 font-semibold';
    if (isRow) return 'bg-blue-50';
    if (isCol) return 'bg-slate-100';
    return defaultBg;
  }, [hoveredCell]);

  const getHeaderBg = useCallback((colKey, defaultBg = 'bg-[#249791] text-white') => {
    return hoveredCell.col === colKey ? 'bg-[#1c7b76] text-white' : defaultBg;
  }, [hoveredCell]);

  return {
    hoveredCell,
    setHoveredCell,
    clearHover,
    hoverHeader,
    hoverCell,
    getCellBg,
    getHeaderBg,
  };
}
