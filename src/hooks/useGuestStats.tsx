import { useContacts } from "./useContacts";

export function useGuestStats() {
  const { data: contacts, isLoading } = useContacts();

  if (isLoading || !contacts) {
    return {
      guestData: [],
      totalGuests: 0,
      isLoading: true,
    };
  }

  // Simular dados de confirmação por dia (últimos 7 dias)
  const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const today = new Date().getDay();
  
  const guestData = days.map((day, index) => {
    const dayOffset = (index - today + 7) % 7;
    // Simular crescimento progressivo baseado em dados reais
    const baseCount = Math.floor(contacts.length / 7);
    const variance = Math.floor(Math.random() * baseCount * 0.3);
    return {
      day,
      guests: baseCount + variance + dayOffset * 2,
    };
  });

  return {
    guestData,
    totalGuests: contacts.length,
    isLoading: false,
  };
}
