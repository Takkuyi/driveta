// src/components/dashboard/MaintenanceAlerts.js
'use client';

import { useState, useEffect } from 'react';
import { Card, Table, Badge, Button, Spinner, Alert } from 'react-bootstrap';
import Link from 'next/link';
import moment from 'moment';
import 'moment/locale/ja';

// API基本URLを定義
const API_BASE_URL = 'http://127.0.0.1:5000/api';

moment.locale('ja');

export default function MaintenanceAlerts() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [overdueRecords, setOverdueRecords] = useState([]);
  const [upcomingRecords, setUpcomingRecords] = useState([]);
  const [expiryAlerts, setExpiryAlerts] = useState([]);
  
  // データ取得
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // 整備概要を取得
        const summaryResponse = await fetch(`${API_BASE_URL}/maintenance/summary/`);
        
        if (summaryResponse.ok) {
          const summaryData = await summaryResponse.json();
          
          if (summaryData.overdue_schedules) {
            setOverdueRecords(summaryData.overdue_schedules.slice(0, 3)); // 最大3件
          }
          
          if (summaryData.upcoming_schedules) {
            setUpcomingRecords(summaryData.upcoming_schedules.slice(0, 3)); // 最大3件
          }
        }
        
        // 車検有効期限アラートを取得
        const expiryResponse = await fetch(`${API_BASE_URL}/maintenance/expiry-alerts/?days=30`);
        
        if (expiryResponse.ok) {
          const expiryData = await expiryResponse.json();
          setExpiryAlerts(expiryData.slice(0, 3)); // 最大3件
        }
        
        setError(null);
      } catch (err) {
        console.error('アラートデータの取得に失敗しました:', err);
        setError('アラートデータの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  if (loading) {
    return (
      <Card>
        <Card.Header>
          <h5 className="mb-0">整備アラート</h5>
        </Card.Header>
        <Card.Body className="text-center py-4">
          <Spinner animation="border" size="sm" />
          <p className="mb-0 mt-2">アラート情報を読み込んでいます...</p>
        </Card.Body>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card>
        <Card.Header>
          <h5 className="mb-0">整備アラート</h5>
        </Card.Header>
        <Card.Body>
          <Alert variant="danger" className="mb-0">
            {error}
          </Alert>
        </Card.Body>
      </Card>
    );
  }
  
  // アラートがない場合
  if (overdueRecords.length === 0 && upcomingRecords.length === 0 && expiryAlerts.length === 0) {
    return (
      <Card>
        <Card.Header>
          <h5 className="mb-0">整備アラート</h5>
        </Card.Header>
        <Card.Body>
          <Alert variant="success" className="mb-0">
            現在、対応が必要なアラートはありません。
          </Alert>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card>
      <Card.Header className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0">整備アラート</h5>
        <Link href="/maintenance/schedule">
          <Button variant="outline-primary" size="sm">すべて表示</Button>
        </Link>
      </Card.Header>
      <Card.Body className="p-0">
        {/* 未実施の点検 */}
        {overdueRecords.length > 0 && (
          <div className="border-bottom">
            <div className="p-3 bg-danger bg-opacity-10">
              <h6 className="mb-0">
                <span className="text-danger">⚠</span> 未実施の点検
              </h6>
            </div>
            <Table responsive className="mb-0">
              <tbody>
                {overdueRecords.map(record => (
                  <tr key={record.id}>
                    <td>
                      <Link href={`/vehicles/${record.vehicle_id}`} className="text-decoration-none">
                        {record.vehicle_plate || `ID: ${record.vehicle_id}`}
                      </Link>
                    </td>
                    <td>{record.maintenance_type}</td>
                    <td>{moment(record.scheduled_date).format('YYYY/MM/DD')}</td>
                    <td className="text-danger">{record.days_overdue}日超過</td>
                    <td>
                      <Link href={`/maintenance/schedule/${record.id}`}>
                        <Button size="sm" variant="outline-danger">対応</Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
        
        {/* 車検期限アラート */}
        {expiryAlerts.length > 0 && (
          <div className="border-bottom">
            <div className="p-3 bg-warning bg-opacity-10">
              <h6 className="mb-0">
                <span className="text-warning">⚠</span> 車検期限アラート
              </h6>
            </div>
            <Table responsive className="mb-0">
              <tbody>
                {expiryAlerts.map(alert => (
                  <tr key={alert.vehicle_id}>
                    <td>
                      <Link href={`/vehicles/${alert.vehicle_id}`} className="text-decoration-none">
                        {alert.plate || `ID: ${alert.vehicle_id}`}
                      </Link>
                    </td>
                    <td>{alert.number || alert.manufacturer || '車両'}</td>
                    <td>{moment(alert.expiry_date).format('YYYY/MM/DD')}</td>
                    <td className={alert.days_left ? 'text-warning' : 'text-danger'}>
                      {alert.days_left 
                        ? `あと${alert.days_left}日` 
                        : `${alert.days_overdue}日超過`}
                    </td>
                    <td>
                      <Link href={`/maintenance/schedule/new?vehicle_id=${alert.vehicle_id}`}>
                        <Button size="sm" variant="outline-warning">点検登録</Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
        
        {/* 今後の点検予定 */}
        {upcomingRecords.length > 0 && (
          <div>
            <div className="p-3 bg-info bg-opacity-10">
              <h6 className="mb-0">
                <span className="text-info">ℹ</span> 今後の点検予定
              </h6>
            </div>
            <Table responsive className="mb-0">
              <tbody>
                {upcomingRecords.map(record => (
                  <tr key={record.id}>
                    <td>
                      <Link href={`/vehicles/${record.vehicle_id}`} className="text-decoration-none">
                        {record.vehicle_plate || `ID: ${record.vehicle_id}`}
                      </Link>
                    </td>
                    <td>{record.maintenance_type}</td>
                    <td>{moment(record.scheduled_date).format('YYYY/MM/DD')}</td>
                    <td>あと{record.days_until}日</td>
                    <td>
                      <Link href={`/maintenance/schedule/${record.id}`}>
                        <Button size="sm" variant="outline-info">詳細</Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Card.Body>
      <Card.Footer className="text-center">
        <Link href="/maintenance/schedule" className="text-decoration-none">
          すべての点検予定を表示
        </Link>
      </Card.Footer>
    </Card>
  );
}