'use client';

import { useState, useEffect } from 'react';
import { Card, Row, Col, Table, Badge, Button } from 'react-bootstrap';
import Link from 'next/link';

export default function VehicleDetailPage({ params }) {
  const { id } = params;
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // 本番ではAPIからデータを取得
    // ここではダミーデータを使用
    const fetchData = () => {
      // IDに基づいて車両データを取得する処理
      const dummyVehicle = {
        id: Number(id),
        number: `TRK-00${id}`,
        plate: `高崎 830 あ ${id}123`,
        type: 'トラック',
        manufacturer: id === '1' ? 'いすゞ' : id === '2' ? '日野' : '三菱ふそう',
        model: id === '1' ? 'エルフ' : id === '2' ? 'デュトロ' : 'キャンター',
        year: 2020,
        dateAcquired: '2020-06-01',
        capacity: 2,
        status: id === '2' ? '整備中' : '運行中',
        notes: id === '1' ? '冷蔵設備付き' : '',
        lastMaintenance: id === '2' ? '2025-03-15' : '2025-01-20',
        maintenanceCount: id === '1' ? 5 : id === '2' ? 7 : 3
      };
      
      setVehicle(dummyVehicle);
      setLoading(false);
    };
    
    fetchData();
  }, [id]);
  
  if (loading) {
    return <div className="text-center p-5">読み込み中...</div>;
  }
  
  if (!vehicle) {
    return <div className="text-center p-5">車両情報が見つかりません</div>;
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1>{vehicle.number}</h1>
          <p className="text-muted">{vehicle.plate}</p>
        </div>
        <div className="d-flex gap-2">
          <Link href={`/vehicles/${id}/edit`}>
            <Button variant="warning">編集</Button>
          </Link>
          <Link href={`/vehicles/${id}/maintenance/add`}>
            <Button variant="primary">整備登録</Button>
          </Link>
        </div>
      </div>
      
      <Row className="mb-4">
        <Col md={8}>
          <Card className="h-100">
            <Card.Header>
              <h5 className="mb-0">基本情報</h5>
            </Card.Header>
            <Card.Body>
              <Table bordered>
                <tbody>
                  <tr>
                    <th style={{ width: '30%' }}>車両番号</th>
                    <td>{vehicle.number}</td>
                  </tr>
                  <tr>
                    <th>ナンバープレート</th>
                    <td>{vehicle.plate}</td>
                  </tr>
                  <tr>
                    <th>車種</th>
                    <td>{vehicle.type}</td>
                  </tr>
                  <tr>
                    <th>メーカー / 型式</th>
                    <td>{vehicle.manufacturer} {vehicle.model}</td>
                  </tr>
                  <tr>
                    <th>製造年</th>
                    <td>{vehicle.year}年</td>
                  </tr>
                  <tr>
                    <th>導入日</th>
                    <td>{vehicle.dateAcquired}</td>
                  </tr>
                  <tr>
                    <th>積載量</th>
                    <td>{vehicle.capacity}t</td>
                  </tr>
                  <tr>
                    <th>状態</th>
                    <td>
                      <Badge bg={
                        vehicle.status === '運行中' ? 'success' : 
                        vehicle.status === '整備中' ? 'warning' : 
                        vehicle.status === '待機中' ? 'info' : 'danger'
                      }>
                        {vehicle.status}
                      </Badge>
                    </td>
                  </tr>
                  <tr>
                    <th>備考</th>
                    <td>{vehicle.notes || '-'}</td>
                  </tr>
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={4}>
          <Card className="h-100">
            <Card.Header>
              <h5 className="mb-0">整備情報</h5>
            </Card.Header>
            <Card.Body>
              <div className="mb-3">
                <div className="d-flex justify-content-between mb-2">
                  <div>最終整備日</div>
                  <div>{vehicle.lastMaintenance || '-'}</div>
                </div>
                <div className="d-flex justify-content-between">
                  <div>整備記録数</div>
                  <div>{vehicle.maintenanceCount}件</div>
                </div>
              </div>
              <div className="d-grid gap-2">
                <Link href={`/vehicles/${id}/maintenance`}>
                  <Button variant="outline-secondary" className="w-100">整備履歴を見る</Button>
                </Link>
                <Link href={`/vehicles/${id}/maintenance/add`}>
                  <Button variant="outline-primary" className="w-100">整備記録を登録</Button>
                </Link>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      <Card>
        <Card.Header>
          <h5 className="mb-0">最近の整備記録</h5>
        </Card.Header>
        <Card.Body>
          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>日付</th>
                <th>種類</th>
                <th>内容</th>
                <th>状態</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>2025-03-15</td>
                <td>定期点検</td>
                <td>3ヶ月点検</td>
                <td><Badge bg="success">完了</Badge></td>
                <td>
                  <Link href={`/vehicles/${id}/maintenance/1`}>
                    <Button size="sm" variant="info">詳細</Button>
                  </Link>
                </td>
              </tr>
              <tr>
                <td>2025-01-20</td>
                <td>オイル交換</td>
                <td>エンジンオイル交換</td>
                <td><Badge bg="success">完了</Badge></td>
                <td>
                  <Link href={`/vehicles/${id}/maintenance/2`}>
                    <Button size="sm" variant="info">詳細</Button>
                  </Link>
                </td>
              </tr>
            </tbody>
          </Table>
          
          <div className="text-center">
            <Link href={`/vehicles/${id}/maintenance`}>
              <Button variant="link">すべての整備記録を見る</Button>
            </Link>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
}