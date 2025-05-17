import { Button } from 'react-bootstrap';
import Link from 'next/link';
import MaintenanceList from '@/components/maintenance/MaintenanceList';

export const metadata = {
  title: '整備記録 | 車両整備管理システム',
};

export default function MaintenancePage() {
  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>整備記録一覧</h1>
        <Link href="/maintenance/new" passHref>
          <Button variant="primary">新規整備記録</Button>
        </Link>
      </div>

      <MaintenanceList />
    </div>
  );
}