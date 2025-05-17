'use client';

import { useEffect, useState } from 'react';
import { Table, Button, Alert, Spinner, Badge, Form, InputGroup } from 'react-bootstrap';
import Link from 'next/link';
import { Vehicle, VehicleStatus } from '@/lib/types';
import { vehicleApi } from '@/lib/api';

export default function VehicleList() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const data = await vehicleApi.getAll();
        setVehicles(data);
        setFilteredVehicles(data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching vehicles:', err);
        setError('車両データの取得中にエラーが発生しました');
        setLoading(false);
        
        // デモ用のダミーデータ
        const dummyData: Vehicle[] = [
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
        ];
        setVehicles(dummyData);
        setFilteredVehicles(dummyData);
        setError(null); // デモデータを表示するためエラーをクリア
      }
    };

    fetchVehicles();
  }, []);

  // 検索とフィルタリングの適用
  useEffect(() => {
    let result = [...vehicles];
    
    // テキスト検索を適用
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      result = result.filter(
        vehicle =>
          vehicle.vehicle_number.toLowerCase().includes(lowerSearchTerm) ||
          vehicle.license_plate.toLowerCase().includes(lowerSearchTerm) ||
          vehicle.manufacturer.toLowerCase().includes(lowerSearchTerm) ||
          vehicle.model.toLowerCase().includes(lowerSearchTerm)
      );
    }
    
    // ステータスフィルタを適用
    if (statusFilter !== 'all') {
      result = result.filter(vehicle => vehicle.status === statusFilter);
    }
    
    setFilteredVehicles(result);
  }, [searchTerm, statusFilter, vehicles]);

  const getStatusBadge = (status: VehicleStatus) => {
    const colorMap: Record<VehicleStatus, string> = {
      '運行中': 'success',
      '整備中': 'warning',
      '待機中': 'info',
      '廃車': 'danger'
    };
    return <Badge bg={colorMap[status]}>{status}</Badge>;
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

  if (error && vehicles.length === 0) {
    return <Alert variant="danger">{error}</Alert>;
  }

  return (
    <div>
      {error && <Alert variant="warning">{error}</Alert>}
      
      <div className="mb-4">
        <div className="row">
          <div className="col-md-6 mb-3">
            <InputGroup>
              <Form.Control
                type="text"
                placeholder="車両番号、ナンバー、メーカー等で検索"
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
          </div>
          <div className="col-md-6 mb-3">
            <Form.Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">すべての状態</option>
              <option value="運行中">運行中</option>
              <option value="整備中">整備中</option>
              <option value="待機中">待機中</option>
              <option value="廃車">廃車</option>
            </Form.Select>
          </div>
        </div>
      </div>

      {filteredVehicles.length === 0 ? (
        <Alert variant="info">条件に一致する車両がありません</Alert>
      ) : (
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>車両番号</th>
              <th>ナンバープレート</th>
              <th>車種</th>
              <th>製造年</th>
              <th>状態</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredVehicles.map((vehicle) => (
              <tr key={vehicle.id}>
                <td>{vehicle.vehicle_number}</td>
                <td>{vehicle.license_plate}</td>
                <td>{vehicle.manufacturer} {vehicle.model}</td>
                <td>{vehicle.year_manufactured}</td>
                <td>{getStatusBadge(vehicle.status)}</td>
                <td>
                  <Link href={`/vehicles/${vehicle.id}`} passHref>
                    <Button variant="info" size="sm" className="me-2">
                      詳細
                    </Button>
                  </Link>
                  <Link href={`/vehicles/${vehicle.id}/edit`} passHref>
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