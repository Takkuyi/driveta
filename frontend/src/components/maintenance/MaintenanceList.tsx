'use client';

import { useEffect, useState } from 'react';
import { Table, Button, Alert, Spinner, Badge, Form, InputGroup, Row, Col } from 'react-bootstrap';
import Link from 'next/link';
import { MaintenanceRecord, Vehicle } from '@/lib/types';
import { maintenanceApi, vehicleApi } from '@/lib/api';

export default function MaintenanceList() {
  const [records, setRecords] = useState<(MaintenanceRecord & { vehicleInfo?: Vehicle })[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<(MaintenanceRecord & { vehicleInfo?: Vehicle })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState({
    from: '',
    to: ''
  });

  useEffect(() => {
    const fetchMaintenanceRecords = async () => {
      try {
        // 整備記録の取得
        const maintenanceData = await maintenanceApi.getAll();
        
        // 車両情報の取得と結合
        const recordsWithVehicleInfo = await Promise.all(
          maintenanceData.map(async (record) => {
            try {
              const vehicleInfo = await vehicleApi.getById(record.vehicle_id);
              return { ...record, vehicleInfo };
            } catch (err) {
              console.error(`Error fetching vehicle info for ID ${record.vehicle_id}:`, err);
              return record;
            }
          })
        );
        
        setRecords(recordsWithVehicleInfo);
        setFilteredRecords(recordsWithVehicleInfo);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching maintenance records:', err);
        setError('整備記録の取得中にエラーが発生しました');
        setLoading(false);
        
        // デモ用のダミーデータ
        const dummyRecords: (MaintenanceRecord & { vehicleInfo?: Vehicle })[] = [
          {
            id: 1,
            vehicle_id: 1,
            maintenance_type: '定期点検',
            description: '3ヶ月点検の実施',
            maintenance_date: '2025-01-15',
            completion_date: '2025-01-15',
            mileage: 15000,
            cost: 35000,
            performed_by: '山田 太郎',
            vendor: '整備工場A',
            status: '完了',
            next_maintenance_date: '2025-04-15',
            vehicleInfo: {
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
            vehicle_id: 2,
            maintenance_type: 'オイル交換',
            description: 'エンジンオイル交換',
            maintenance_date: '2025-02-28',
            completion_date: '2025-02-28',
            mileage: 18000,
            cost: 8000,
            performed_by: '鈴木 一郎',
            vendor: '整備工場B',
            status: '完了',
            next_maintenance_date: '2025-05-28',
            vehicleInfo: {
              id: 2,
              vehicle_number: 'TRK-002',
              license_plate: '品川 500 い 56-78',
              vehicle_type: 'トラック',
              manufacturer: '日野',
              model: 'デュトロ',
              year_manufactured: 2021,
              date_acquired: '2021-03-15',
              status: '待機中'
            }
          },
          {
            id: 3,
            vehicle_id: 3,
            maintenance_type: 'タイヤ交換',
            description: 'リアタイヤ4本交換',
            maintenance_date: '2025-03-10',
            completion_date: null,
            mileage: 22000,
            cost: 120000,
            performed_by: '佐藤 次郎',
            vendor: '整備工場C',
            status: '進行中',
            next_maintenance_date: null,
            vehicleInfo: {
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
        ];
        setRecords(dummyRecords);
        setFilteredRecords(dummyRecords);
        setError(null); // デモデータを表示するためエラーをクリア
      }
    };

    fetchMaintenanceRecords();
  }, []);

  // 検索とフィルタリングの適用
  useEffect(() => {
    let result = [...records];
    
    // テキスト検索を適用
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      result = result.filter(
        record =>
          (record.vehicleInfo?.vehicle_number.toLowerCase().includes(lowerSearchTerm)) ||
          (record.vehicleInfo?.license_plate.toLowerCase().includes(lowerSearchTerm)) ||
          record.maintenance_type.toLowerCase().includes(lowerSearchTerm) ||
          record.description.toLowerCase().includes(lowerSearchTerm) ||
          (record.performed_by && record.performed_by.toLowerCase().includes(lowerSearchTerm)) ||
          (record.vendor && record.vendor.toLowerCase().includes(lowerSearchTerm))
      );
    }
    
    // ステータスフィルタを適用
    if (statusFilter !== 'all') {
      result = result.filter(record => record.status === statusFilter);
    }
    
    // 日付範囲フィルタを適用
    if (dateRange.from) {
      result = result.filter(record => record.maintenance_date >= dateRange.from);
    }
    
    if (dateRange.to) {
      result = result.filter(record => record.maintenance_date <= dateRange.to);
    }
    
    setFilteredRecords(result);
  }, [searchTerm, statusFilter, dateRange, records]);

  const handleDateRangeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setDateRange(prev => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setDateRange({ from: '', to: '' });
  };

  const getStatusBadge = (status: string) => {
    const colorMap: Record<string, string> = {
      '完了': 'success',
      '進行中': 'warning',
      '計画中': 'info',
      'キャンセル': 'danger'
    };
    return <Badge bg={colorMap[status] || 'secondary'}>{status}</Badge>;
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

  if (error && records.length === 0) {
    return <Alert variant="danger">{error}</Alert>;
  }

  return (
    <div>
      {error && <Alert variant="warning">{error}</Alert>}
      
      <div className="mb-4">
        <Row>
          <Col md={6} lg={4} className="mb-3">
            <InputGroup>
              <Form.Control
                type="text"
                placeholder="車両番号、整備内容等で検索"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <Button 
                  variant="outline-secondary" 
                  onClick={() => setSearchTerm('')}
                >
                  ✕
                </Button>
              )}
            </InputGroup>
          </Col>
          <Col md={6} lg={3} className="mb-3">
            <Form.Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">すべての状態</option>
              <option value="計画中">計画中</option>
              <option value="進行中">進行中</option>
              <option value="完了">完了</option>
              <option value="キャンセル">キャンセル</option>
            </Form.Select>
          </Col>
          <Col md={6} lg={2} className="mb-3">
            <Form.Control
              type="date"
              placeholder="開始日"
              name="from"
              value={dateRange.from}
              onChange={handleDateRangeChange}
            />
          </Col>
          <Col md={6} lg={2} className="mb-3">
            <Form.Control
              type="date"
              placeholder="終了日"
              name="to"
              value={dateRange.to}
              onChange={handleDateRangeChange}
            />
          </Col>
          <Col lg={1} className="mb-3 d-flex align-items-center">
            {(searchTerm || statusFilter !== 'all' || dateRange.from || dateRange.to) && (
              <Button variant="outline-secondary" size="sm" onClick={clearFilters}>
                クリア
              </Button>
            )}
          </Col>
        </Row>
      </div>

      {filteredRecords.length === 0 ? (
        <Alert variant="info">条件に一致する整備記録がありません</Alert>
      ) : (
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>日付</th>
              <th>車両</th>
              <th>整備種類</th>
              <th>内容</th>
              <th>状態</th>
              <th>費用</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.map((record) => (
              <tr key={record.id}>
                <td>{new Date(record.maintenance_date).toLocaleDateString('ja-JP')}</td>
                <td>
                  {record.vehicleInfo ? (
                    <Link href={`/vehicles/${record.vehicle_id}`}>
                      {record.vehicleInfo.vehicle_number}
                    </Link>
                  ) : (
                    `ID: ${record.vehicle_id}`
                  )}
                </td>
                <td>{record.maintenance_type}</td>
                <td>{record.description}</td>
                <td>{getStatusBadge(record.status)}</td>
                <td>{record.cost ? `¥${record.cost.toLocaleString()}` : '-'}</td>
                <td>
                  <Link href={`/maintenance/${record.id}`} passHref>
                    <Button variant="info" size="sm" className="me-2">
                      詳細
                    </Button>
                  </Link>
                  <Link href={`/maintenance/${record.id}/edit`} passHref>
                    <Button variant="warning" size="sm">
                      編集
                    </Button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}