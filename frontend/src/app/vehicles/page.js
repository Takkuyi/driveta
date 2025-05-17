'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Table, Button, Badge, Card, Form, InputGroup } from 'react-bootstrap';

export default function VehiclesPage() {
  // ダミーデータ
  const [vehicles, setVehicles] = useState([
    { id: 1, number: 'TRK-001', plate: '高崎 830 あ 3035', type: 'トラック', manufacturer: 'いすゞ', model: 'エルフ', year: 2020, status: '運行中' },
    { id: 2, number: 'TRK-002', plate: '高崎 500 い 5678', type: 'トラック', manufacturer: '日野', model: 'デュトロ', year: 2021, status: '整備中' },
    { id: 3, number: 'TRK-003', plate: '高崎 300 う 9012', type: 'トラック', manufacturer: '三菱ふそう', model: 'キャンター', year: 2019, status: '待機中' }
  ]);
  
  // 検索機能
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // フィルター適用後の車両リスト
  const filteredVehicles = vehicles.filter(vehicle => {
    // 検索条件のフィルタリング
    const matchesSearch = 
      vehicle.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.model.toLowerCase().includes(searchTerm.toLowerCase());
    
    // ステータスフィルタリング
    const matchesStatus = statusFilter === 'all' || vehicle.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>車両一覧</h1>
        <Link href="/vehicles/add">
          <Button variant="primary">新規車両登録</Button>
        </Link>
      </div>
      
      {/* 検索・フィルターエリア */}
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

      <Card>
        <Card.Body>
          {filteredVehicles.length === 0 ? (
            <div className="text-center p-4">
              <p className="text-muted">条件に一致する車両がありません</p>
            </div>
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
                    <td>{vehicle.number}</td>
                    <td>{vehicle.plate}</td>
                    <td>{vehicle.manufacturer} {vehicle.model}</td>
                    <td>{vehicle.year}</td>
                    <td>
                      <Badge bg={
                        vehicle.status === '運行中' ? 'success' : 
                        vehicle.status === '整備中' ? 'warning' : 
                        vehicle.status === '待機中' ? 'info' : 'danger'
                      }>
                        {vehicle.status}
                      </Badge>
                    </td>
                    <td>
                      <div className="d-flex gap-1 flex-wrap">
                        <Link href={`/vehicles/${vehicle.id}`}>
                          <Button size="sm" variant="info">詳細</Button>
                        </Link>
                        <Link href={`/vehicles/${vehicle.id}/edit`}>
                          <Button size="sm" variant="warning">編集</Button>
                        </Link>
                        <Link href={`/vehicles/${vehicle.id}/maintenance`}>
                          <Button size="sm" variant="secondary">整備記録</Button>
                        </Link>
                        <Link href={`/vehicles/${vehicle.id}/maintenance/add`}>
                          <Button size="sm" variant="outline-primary">整備登録</Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}