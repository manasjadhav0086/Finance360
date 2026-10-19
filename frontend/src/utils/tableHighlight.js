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
    if (isRow && isCol) return 'bg-[#EBF2FE] font-medium';
    if (isRow) return 'bg-[#F8FAFC]';
    if (isCol) return 'bg-[#F1F5F9]';
    return defaultBg;
  }, [hoveredCell]);

  const getHeaderBg = useCallback((colKey, defaultBg = 'bg-[#101828] text-white') => {
    return hoveredCell.col === colKey ? 'bg-[#1D2939] text-white' : defaultBg;
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
