import { ModernLayout } from '@/components/ModernLayout';
import { Calendar as CalendarComponent } from '@/components/Calendar';

export default function Calendar() {
  return (
    <ModernLayout
      title="Calendário"
      subtitle="Gerencie prazos, reuniões e eventos"
    >
      <CalendarComponent />
    </ModernLayout>
  );
}