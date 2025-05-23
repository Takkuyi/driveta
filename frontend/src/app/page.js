// src/app/page.js（ダッシュボード）
'use client';

import { Row, Col } from 'react-bootstrap';
import DashboardClient from '@/components/dashboard/DashboardClient';
import MaintenanceAlerts from '@/components/dashboard/MaintenanceAlerts';

export default function DashboardPage() {
  return (
    <div>
      <h1 className="mb-4">ダッシュボード</h1>
      
      <DashboardClient />
      
      {/* 整備アラートウィジェットを追加 */}
      <Row className="mt-4">
        <Col>
          <MaintenanceAlerts />
        </Col>
      </Row>
    </div>
  );
}