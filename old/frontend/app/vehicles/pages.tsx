import { Button } from 'react-bootstrap';
import Link from 'next/link';
import VehicleList from '@/components/vehicles/VehicleList';

export const metadata = {
  title: '車両管理 | 車両整備管理システム',
};

export default function VehiclesPage() {
  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>車両一覧</h1>
        <Link href="/vehicles/new" passHref>
          <Button variant="primary">新規車両登録</Button>
        </Link>
      </div>

      <VehicleList />
    </div>
  );
}