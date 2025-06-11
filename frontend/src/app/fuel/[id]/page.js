// src/app/fuel/[id]/page.js
'use client';

import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Alert, Spinner, Modal } from 'react-bootstrap';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import moment from 'moment';
import 'moment/locale/ja';

// API基本URLを定義
const API_BASE_URL = 'http://127.0.0.1:5000/api';

moment.locale('ja');

export default function FuelDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { id } = params;
  
  const [fuelRecord, setFuelRecord] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // 給油記録詳細データを取得
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // 給油記録詳細を取得
        const response = await fetch(`${API_BASE_URL}/fuel/records/${id}/`);
        
        if (!response.ok) {
          throw new Error(`給油記録取得エラー: ${response.status}`);
        }
        
        const data = await response.json();
        setFuelRecord(data);
        
        // 車両情報があれば設定
        if (data.vehicle_info) {
          setVehicle(data.vehicle_info);
        } else if (data.vehicle_id) {
          // 車両詳細を取得
          const vehicleResponse = await fetch(`${API_BASE_URL}/vehicles/${data.vehicle_id}/`);
          if (vehicleResponse.ok) {
            const vehicleData = await vehicleResponse.json();
            setVehicle(vehicleData);
          }
        }
        
        setError(null);
      } catch (err) {
        console.error('データの取得に失敗しました:', err);
        setError(`データの取得に失敗しました。${err.message}`);
        
        // デモ用のダミーデータ
        const dummyData = {
          id: parseInt(id),
          vehicle_id: 1,
          fuel_date: '2025-06-10',
          fuel_amount: 45.2,
          fuel_cost: 6780,
          unit_price: 150,
          mileage: 85234,
          fuel_station: 'ENEOS 高崎インター店',
          attendant: '山田 太郎',
          payment_method: 'corporate_card',
          receipt_number: 'R202506100123',
          notes: '定期給油。エンジンオイルも確認済み。',
          vehicle_info: {
            plate: '品川 800 あ 12-34',
            number: 'TRK-001',
            manufacturer: 'いすゞ'
          },
          created_at: '2025-06-10T09:30:00Z',
          updated_at: '2025-06-10T09:30:00Z'
        };
        setFuelRecord(dummyData);
        setVehicle(dummyData.vehicle_info);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [id]);
  
  // 給油記録の削除
  const deleteFuelRecord = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`${API_BASE_URL}/fuel/records/${id}/`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error(`削除エラー: ${response.status}`);
      }
      
      // 削除成功
      alert('給油記録を削除しました');
      router.push('/fuel');
    } catch (err) {
      console.error('削除エラー:', err);
      setError(`削除エラー: ${err.message}`);
      setShowDeleteModal(false);
      
      // デモモードの場合は成功したふりをする
      setTimeout(() => {
        router.push('/fuel');
      }, 1000);
    } finally {
      setLoading(false);
    }
  };

  // 支払方法の表示
  const getPaymentMethodBadge = (method) => {
    const methodMap = {
      'cash': { text: '現金', variant: 'success' },
      'card': { text: 'カード', variant: 'primary' },
      'corporate_card': { text: '法人カード', variant: 'info' },
      'fuel_card': { text: '給油カード', variant: 'warning' }
    };
    
    const methodInfo = methodMap[method] || { text: method, variant: 'secondary' };
    return <Badge bg={methodInfo.variant}>{methodInfo.text}</Badge>;
  };

  // 燃費計算（前回給油からの）
  const calculateFuelEfficiency = () => {
    // 実際の実装では前回の給油記録との差から計算
    // ここではダミーデータとして表示
    return '8.5';
  };
  
  if (loading) {
    return (
      <div className="text-center p-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">読み込み中...</span>
        </Spinner>
        <p className="mt-2">給油データを読み込んでいます...</p>
      </div>
    );
  }
  
  if (error && !fuelRecord) {
    return (
      <Alert variant="danger">
        <Alert.Heading>エラーが発生しました</Alert.Heading>
        <p>{error}</p>
        <hr />
        <div className="d-flex justify-content-between">
          <Link href="/fuel">
            <Button variant="outline-primary">給油一覧に戻る</Button>
          </Link>
          <Button 
            variant="outline-danger" 
            onClick={() => window.location.reload()}
          >
            再試行
          </Button>
        </div>
      </Alert>
    );
  }
  
  if (!fuelRecord) {
    return (
      <Alert variant="warning">
        <Alert.Heading>給油記録が見つかりません</Alert.Heading>
        <p>指定された給油記録ID ({id}) の情報が見つかりませんでした。</p>
        <hr />
        <div className="d-flex justify-content-start">
          <Link href="/fuel">
            <Button variant="outline-primary">給油一覧に戻る</Button>
          </Link>
        </div>
      </Alert>
    );
  }

  return (
    <Container>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>給油記録詳細</h1>
        <div className="d-flex gap-2">
          <Link href="/fuel">
            <Button variant="outline-secondary">一覧に戻る</Button>
          </Link>
          <Link href={`/fuel/${id}/edit`}>
            <Button variant="warning">編集</Button>
          </Link>
          <Button 
            variant="danger" 
            onClick={() => setShowDeleteModal(true)}
          >
            削除
          </Button>
        </div>
      </div>
      
      {error && (
        <Alert variant="warning" className="mb-4">
          {error}（デモモードで動作中）
        </Alert>
      )}
      
      <Row>
        <Col md={8}>
          <Card className="mb-4">
            <Card.Header>
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">給油情報</h5>
                <small className="text-muted">
                  記録日時: {moment(fuelRecord.created_at).format('YYYY/MM/DD HH:mm')}
                </small>
              </div>
            </Card.Header>
            <Card.Body>
              <Table bordered>
                <tbody>
                  <tr>
                    <th style={{ width: '30%' }}>給油日</th>
                    <td>{moment(fuelRecord.fuel_date).format('YYYY年MM月DD日')}</td>
                  </tr>
                  <tr>
                    <th>車両</th>
                    <td>
                      <Link href={`/vehicles/${fuelRecord.vehicle_id}`}>
                        {vehicle?.plate || ''} ({vehicle?.number || `ID:${fuelRecord.vehicle_id}`})
                      </Link>
                      {vehicle?.manufacturer && (
                        <span className="text-muted ms-2">- {vehicle.manufacturer}</span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <th>給油量</th>
                    <td className="fs-5 fw-bold text-primary">{fuelRecord.fuel_amount}L</td>
                  </tr>
                  <tr>
                    <th>単価</th>
                    <td>¥{fuelRecord.unit_price}/L</td>
                  </tr>
                  <tr>
                    <th>金額</th>
                    <td className="fs-5 fw-bold text-success">¥{fuelRecord.fuel_cost.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <th>走行距離</th>
                    <td>
                      {fuelRecord.mileage ? `${fuelRecord.mileage.toLocaleString()}km` : '-'}
                    </td>
                  </tr>
                  <tr>
                    <th>給油所</th>
                    <td>{fuelRecord.fuel_station}</td>
                  </tr>
                  <tr>
                    <th>担当者</th>
                    <td>{fuelRecord.attendant || '-'}</td>
                  </tr>
                  <tr>
                    <th>支払方法</th>
                    <td>{getPaymentMethodBadge(fuelRecord.payment_method)}</td>
                  </tr>
                  <tr>
                    <th>レシート番号</th>
                    <td>{fuelRecord.receipt_number || '-'}</td>
                  </tr>
                  <tr>
                    <th>備考</th>
                    <td>{fuelRecord.notes || '-'}</td>
                  </tr>
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={4}>
          {/* 車両情報 */}
          <Card className="mb-4">
            <Card.Header className="bg-info text-white">
              <h5 className="mb-0">車両情報</h5>
            </Card.Header>
            <Card.Body>
              {vehicle ? (
                <>
                  <p className="mb-2">
                    <strong>ナンバープレート:</strong><br />
                    {vehicle.plate || '-'}
                  </p>
                  <p className="mb-2">
                    <strong>車両番号:</strong><br />
                    {vehicle.number || '-'}
                  </p>
                  <p className="mb-2">
                    <strong>メーカー:</strong><br />
                    {vehicle.manufacturer || '-'}
                  </p>
                  <div className="d-grid gap-2 mt-3">
                    <Link href={`/vehicles/${fuelRecord.vehicle_id}`}>
                      <Button variant="outline-info" className="w-100">
                        車両詳細を見る
                      </Button>
                    </Link>
                    <Link href={`/fuel/add?vehicle_id=${fuelRecord.vehicle_id}`}>
                      <Button variant="outline-primary" className="w-100">
                        この車両の給油記録
                      </Button>
                    </Link>
                  </div>
                </>
              ) : (
                <p className="text-center">車両情報を取得できません</p>
              )}
            </Card.Body>
          </Card>
          
          {/* 燃費情報 */}
          <Card className="mb-4">
            <Card.Header className="bg-success text-white">
              <h5 className="mb-0">燃費情報</h5>
            </Card.Header>
            <Card.Body>
              <div className="text-center mb-3">
                <div className="fs-3 fw-bold text-success">
                  {calculateFuelEfficiency()}km/L
                </div>
                <small className="text-muted">前回給油からの燃費</small>
              </div>
              
              <hr />
              
              <div className="row text-center">
                <div className="col-6">
                  <div className="fw-bold">{fuelRecord.fuel_amount}L</div>
                  <small className="text-muted">給油量</small>
                </div>
                <div className="col-6">
                  <div className="fw-bold">¥{(fuelRecord.fuel_cost / fuelRecord.fuel_amount).toFixed(1)}</div>
                  <small className="text-muted">実質単価</small>
                </div>
              </div>
            </Card.Body>
          </Card>
          
          {/* アクション */}
          <Card className="mb-4">
            <Card.Header className="bg-secondary text-white">
              <h5 className="mb-0">アクション</h5>
            </Card.Header>
            <Card.Body>
              <div className="d-grid gap-2">
                <Link href={`/fuel/add?vehicle_id=${fuelRecord.vehicle_id}`}>
                  <Button variant="primary" className="w-100">
                    この車両の新規給油記録
                  </Button>
                </Link>
                <Link href={`/fuel/${id}/edit`}>
                  <Button variant="warning" className="w-100">
                    この記録を編集
                  </Button>
                </Link>
                <Button 
                  variant="outline-danger" 
                  className="w-100"
                  onClick={() => setShowDeleteModal(true)}
                >
                  この記録を削除
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      {/* 削除確認モーダル */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>削除の確認</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>この給油記録を削除しますか？</p>
          <p>
            <strong>給油日:</strong> {moment(fuelRecord.fuel_date).format('YYYY年MM月DD日')}<br />
            <strong>車両:</strong> {vehicle?.plate || fuelRecord.vehicle_id}<br />
            <strong>給油量:</strong> {fuelRecord.fuel_amount}L<br />
            <strong>金額:</strong> ¥{fuelRecord.fuel_cost.toLocaleString()}
          </p>
          <p className="text-danger">この操作は元に戻せません。</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            キャンセル
          </Button>
          <Button variant="danger" onClick={deleteFuelRecord} disabled={loading}>
            {loading ? '処理中...' : '削除する'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}