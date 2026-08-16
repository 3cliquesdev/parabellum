"use client";

import { useEffect, useState } from "react";

// Convenção: nunca usar `shrink-0` nos dois lados de uma linha `justify-between` — o
// lado com mais conteúdo variável precisa de `min-w-0`/`flex-1` pra ceder espaço antes.
// Ações secundárias com 3+ itens devem colapsar num menu "⋯" (ver este hook) em vez de
// crescer horizontalmente sem limite.
export function useIsCompact(breakpointPx = 768): boolean {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpointPx}px)`);

    function sync() {
      setCompact(mql.matches);
    }
    sync();

    mql.addEventListener("change", sync);
    return () => mql.removeEventListener("change", sync);
  }, [breakpointPx]);

  return compact;
}
