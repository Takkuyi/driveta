// app/page.tsx
import DashboardClient from '@/components/dashboard/DashboardClient';

export const metadata = {
  title: 'ダッシュボード | DRIBVETA',
};

export default function DashboardPage() {
  return <DashboardClient />;
}