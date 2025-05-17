'use client';

import { useEffect, useState } from 'react';
import { Table, Badge, Button } from 'react-bootstrap';
import { MaintenanceAlert } from '@/lib/types';
import axios from 'axios';
import Link from 'next/link';

export default function MaintenanceAlerts() {
  const [alerts, setAlerts] = useState<MaintenanceAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        // 本番環境では実際のAPIエンドポイントを使用
        const response = await axios.get('/api/maintenance-alerts');
        setAlerts(response.data);
      } catch (error) {
        console.error('Error fetching alerts:', error);
        // デモ用のダミーデータ
        setAlerts([
          {
            id: 1,
            vehicle_id: 1,
            alert_type: 'オイル交換',
            description: '定期的なオイル交換が必要です',
            due_date: '2025-04-15',
            status: '未対応',
            priority: '高',
            vehicle: {
              id: 1,
              vehicle_number: 'TRK-001',
              license_plate: '品川 800 あ 12-34',
              vehicle_type: 'トラック',
              manufacturer: 'いすゞ',
              model: 'エルフ',
              year_manufactured: 2020,
              date_acquired: '2020-06-01',
              status: '運行中'
            }
          },
          {
            id: 2,
            vehicle_id: 3,
            alert_type: 'タイヤ交換',
            description: 'リアタイヤの摩耗が進んでいます',
            due_date: '2025-04-20',
            status: '未対応',
            priority: '中',
            vehicle: {
              id: 3,
              vehicle_number: 'TRK-003',
              license_plate: '品川 500 い 56-78',
              vehicle_type: 'トラック',
              manufacturer: '日野',
              model: 'レンジャー',
              year_manufactured: 2019,
              date_acquired: '2019-08-15',
              status: '運行中'
            }
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
  }, []);

  const getPriorityBadge = (priority: string) => {
    const colorMap: Record<string, string> = {
      '高': 'danger',
      '中': 'warning',
      '低': 'info'
    };
    return <Badge bg={colorMap[priority] || 'secondary'}>{priority}</Badge>;
  };

  if (loading) {
    return <p>アラート情報を読み込み中...</p>;
  }

  if (alerts.length === 0) {
    return <p>現在、アクティブなアラートはありません。</p>;
  }

  return (
    <Table striped bordered hover responsive>
      <thead>
        <tr>
          <th>優先度</th>
          <th>車両</th>
          <th>アラート内容</th>
          <th>期日</th>
          <th>状態</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        {alerts.map(alert => (
          <tr key={alert.id}>
            <td>{getPriorityBadge(alert.priority)}</td>
            <td>
              {alert.vehicle ? (
                <Link href={`/vehicles/${alert.vehicle_id}`}>
                  {alert.vehicle.vehicle_number} ({alert.vehicle.license_plate})
                </Link>
              ) : (
                `車両ID: ${alert.vehicle_id}`
              )}
            </td>
            <td>
              <strong>{alert.alert_type}</strong>: {alert.description}
            </td>
            <td>{new Date(alert.due_date).toLocaleDateString('ja-JP')}</td>
            <td>
              <Badge bg={alert.status === '未対応' ? 'danger' : alert.status === '対応中' ? 'warning' : 'success'}>
                {alert.status}
              </Badge>
            </td>
            <td>
              <Link href={`/maintenance/new?vehicle_id=${alert.vehicle_id}&alert_id=${alert.id}`} passHref>
                <Button size="sm" variant="primary">対応記録</Button>
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}