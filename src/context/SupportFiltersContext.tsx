import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { startOfMonth, endOfDay } from "date-fns";

// =============================================
// Types
// =============================================

export interface SupportFilters {
  startDate: Date;
  endDate: Date;
  channel: string | null;
  departmentId: string | null;
  agentId: string | null;
  status: string | null;
}

interface SupportFiltersContextType {
  // Applied filters (used by queries)
  appliedFilters: SupportFilters;
  
  // Draft filters (used by UI)
  draftFilters: SupportFilters;
  
  // Update draft filters
  setDraftFilters: (filters: Partial<SupportFilters>) => void;
  
  // Apply draft filters to queries
  applyFilters: () => void;
  
  // Reset draft to applied
  resetDraft: () => void;
  
  // Check if draft differs from applied
  hasPendingChanges: boolean;
  
  // endExclusive helper for queries
  getEndExclusive: () => Date;
}

// =============================================
// Default values
// =============================================

const getDefaultFilters = (): SupportFilters => ({
  startDate: startOfMonth(new Date()),
  endDate: endOfDay(new Date()),
  channel: null,
  departmentId: null,
  agentId: null,
  status: null,
});

// =============================================
// Context
// =============================================

const SupportFiltersContext = createContext<SupportFiltersContextType | undefined>(undefined);

// =============================================
// Provider
// =============================================

export function SupportFiltersProvider({ children }: { children: ReactNode }) {
  const [appliedFilters, setAppliedFilters] = useState<SupportFilters>(getDefaultFilters);
  const [draftFilters, setDraftFiltersState] = useState<SupportFilters>(getDefaultFilters);

  const setDraftFilters = useCallback((updates: Partial<SupportFilters>) => {
    setDraftFiltersState(prev => ({ ...prev, ...updates }));
  }, []);

  const applyFilters = useCallback(() => {
    setAppliedFilters(draftFilters);
  }, [draftFilters]);

  const resetDraft = useCallback(() => {
    setDraftFiltersState(appliedFilters);
  }, [appliedFilters]);

  // Check if any filter differs
  const hasPendingChanges = 
    draftFilters.startDate.getTime() !== appliedFilters.startDate.getTime() ||
    draftFilters.endDate.getTime() !== appliedFilters.endDate.getTime() ||
    draftFilters.channel !== appliedFilters.channel ||
    draftFilters.departmentId !== appliedFilters.departmentId ||
    draftFilters.agentId !== appliedFilters.agentId ||
    draftFilters.status !== appliedFilters.status;

  // Returns endDate + 1 day at 00:00:00 for exclusive range queries
  const getEndExclusive = useCallback(() => {
    const endExclusive = new Date(appliedFilters.endDate);
    endExclusive.setDate(endExclusive.getDate() + 1);
    endExclusive.setHours(0, 0, 0, 0);
    return endExclusive;
  }, [appliedFilters.endDate]);

  return (
    <SupportFiltersContext.Provider
      value={{
        appliedFilters,
        draftFilters,
        setDraftFilters,
        applyFilters,
        resetDraft,
        hasPendingChanges,
        getEndExclusive,
      }}
    >
      {children}
    </SupportFiltersContext.Provider>
  );
}

// =============================================
// Hook
// =============================================

export function useSupportFilters() {
  const context = useContext(SupportFiltersContext);
  if (context === undefined) {
    throw new Error("useSupportFilters must be used within a SupportFiltersProvider");
  }
  return context;
}
