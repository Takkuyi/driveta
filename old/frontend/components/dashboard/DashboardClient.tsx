'use client';

import { useState, useEffect } from 'react';
import { Row, Col, Card, Table, Badge, Spinner, Alert } from 'react-bootstrap';
import Link from 'next/link';
import { MaintenanceAlert, Vehicle } from '@/lib/types';
import axios from 'axios';

export default function DashboardClient() {
  const [vehicleStats, setVehicleStats] = useState({
    total: 0,
    inOperation: 0,
    inMaintenance: 0,
    standby: 0
  });
  const [recentVehicles, setRecentVehicles] = useState<Vehicle[]>([]);
  const [maintenanceAlerts, setMaintenanceAlerts] = useState<MaintenanceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // 本番環境では各APIエンドポイントを実装する必要があります
        // const statsResponse = await axios.get('/api/stats/vehicles');
        // const vehiclesResponse = await axios.get('/api/vehicles/recent');
        // const alertsResponse = await axios.get('/api/maintenance-alerts');
        
        // デモ用のダミーデータ
        setVehicleStats({
          total: 24,
          inOperation: 18,
          inMaintenance: 3,
          standby: 3
        });
        
        setRecentVehicles([
          {
            id: 1,
            vehicle_number: 'TRK-001',
            license_plate: '品川 800 あ 12-34',
            vehicle_type: 'トラック',
            manufacturer: 'いすゞ',
            model: 'エルフ',
            year_manufactured: 2020,
            date_acquired: '2020-06-01',
            capacity: 2,
            status: '運行中',
            notes: '冷蔵設備付き'
          },
          {
            id: 2,
            vehicle_number: 'TRK-002',
            license_plate: '品川 500 い 56-78',
            vehicle_type: 'トラック',
            manufacturer: '日野',
            model: 'デュトロ',
            year_manufactured: 2021,
            date_acquired: '2021-03-15',
            capacity: 3,
            status: '待機中',
            notes: ''
          },
          {
            id: 3,
            vehicle_number: 'TRK-003',
            license_plate: '品川 300 う 90-12',
            vehicle_type: 'トラック',
            manufacturer: '三菱ふそう',
            model: 'キャンター',
            year_manufactured: 2019,
            date_acquired: '2019-11-20',
            capacity: 2.5,
            status: '整備中',
            notes: 'エンジンオイル交換中'
          }
        ]);
        
        setMaintenanceAlerts([
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
              license_plate: '品川 300 う 90-12',
              vehicle_type: 'トラック',
              manufacturer: '三菱ふそう',
              model: 'キャンター',
              year_manufactured: 2019,
              date_acquired: '2019-11-20',
              status: '整備中'
            }
          }
        ]);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('データの取得中にエラーが発生しました');
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const getStatusBadge = (status: string) => {
    const colorMap: Record<string, string> = {
      '運行中': 'success',
      '整備中': 'warning',
      '待機中': 'info',
      '廃車': 'danger',
      '未対応': 'danger',
      '対応中': 'warning',
      '完了': 'success'
    };
    return <Badge bg={colorMap[status] || 'secondary'}>{status}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const colorMap: Record<string, string> = {
      '高': 'danger',
      '中': 'warning',
      '低': 'info'
    };
    return <Badge bg={colorMap[priority] || 'secondary'}>{priority}</Badge>;
  };

  if (loading) {
    return (
      <div className="text-center my-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">読み込み中...</span>
        </Spinner>
      </div>
    );
  }

  if (error) {
    return <Alert variant="danger">{error}</Alert>;
  }

  return (
    <div>
      <h1 className="mb-4">ダッシュボード</h1>
      
      <Row className="mb-4">
        <Col md={3}>
          <Card className="border-primary mb-3 h-100">
            <Card.Body>
              <div className="d-flex justify-content-between">
                <div>
                  <Card.Title className="text-muted">車両総数</Card.Title>
                  <Card.Text className="fs-2 fw-bold">{vehicleStats.total}</Card.Text>
                </div>
                <div className="fs-1 text-muted">🚚</div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-success mb-3 h-100">
            <Card.Body>
              <div className="d-flex justify-content-between">
                <div>
                  <Card.Title className="text-muted">運行中</Card.Title>
                  <Card.Text className="fs-2 fw-bold">{vehicleStats.inOperation}</Card.Text>
                </div>
                <div className="fs-1 text-muted">🟢</div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-warning mb-3 h-100">
            <Card.Body>
              <div className="d-flex justify-content-between">
                <div>
                  <Card.Title className="text-muted">整備中</Card.Title>
                  <Card.Text className="fs-2 fw-bold">{vehicleStats.inMaintenance}</Card.Text>
                </div>
                <div className="fs-1 text-muted">🔧</div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-info mb-3 h-100">
            <Card.Body>
              <div className="d-flex justify-content-between">
                <div>
                  <Card.Title className="text-muted">待機中</Card.Title>
                  <Card.Text className="fs-2 fw-bold">{vehicleStats.standby}</Card.Text>
                </div>
                <div className="fs-1 text-muted">⏸️</div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      <Row className="mb-4">
        <Col md={6}>
          <Card className="h-100">
            <Card.Header>
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">整備アラート</h5>
                <Link href="/maintenance/new" className="btn btn-sm btn-primary">
                  新規整備計画
                </Link>
              </div>
            </Card.Header>
            <Card.Body>
              {maintenanceAlerts.length === 0 ? (
                <p className="text-center text-muted">現在、アクティブなアラートはありません。</p>
              ) : (
                <Table responsive hover>
                  <thead>
                    <tr>
                      <th>優先度</th>
                      <th>車両</th>
                      <th>内容</th>
                      <th>期日</th>
                      <th>状態</th>
                    </tr>
                  </thead>
                  <tbody>
                    {maintenanceAlerts.map((alert) => (
                      <tr key={alert.id}>
                        <td>{getPriorityBadge(alert.priority)}</td>
                        <td>
                          <Link href={`/vehicles/${alert.vehicle_id}`}>
                            {alert.vehicle?.vehicle_number}
                          </Link>
                        </td>
                        <td>{alert.alert_type}: {alert.description}</td>
                        <td>{new Date(alert.due_date).toLocaleDateString('ja-JP')}</td>
                        <td>{getStatusBadge(alert.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={6}>
          <Card className="h-100">
            <Card.Header>
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">最近の車両</h5>
                <Link href="/vehicles" className="btn btn-sm btn-primary">
                  すべての車両
                </Link>
              </div>
            </Card.Header>
            <Card.Body>
              <Table responsive hover>
                <thead>
                  <tr>
                    <th>車両番号</th>
                    <th>種類</th>
                    <th>状態</th>
                    <th>詳細</th>
                  </tr>
                </thead>
                <tbody>
                  {recentVehicles.map((vehicle) => (
                    <tr key={vehicle.id}>
                      <td>{vehicle.vehicle_number}</td>
                      <td>{vehicle.manufacturer} {vehicle.model}</td>
                      <td>{getStatusBadge(vehicle.status)}</td>
                      <td>
                        <Link href={`/vehicles/${vehicle.id}`} passHref>
                          <Button variant="outline-info" size="sm">詳細</Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
}