// src/app/vehicles/[id]/page.js
'use client';

import { useState, useEffect } from 'react';
import { Card, Row, Col, Table, Badge, Button, Alert, Spinner, Tabs, Tab } from 'react-bootstrap';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import moment from 'moment';
import 'moment/locale/ja';

// API基本URLを定義
const API_BASE_URL = 'http://127.0.0.1:5000/api';

moment.locale('ja');

export default function VehicleDetailPage() {
  const params = useParams();
  const { id } = params;
  
  const [vehicle, setVehicle] = useState(null);
  const [maintenanceRecords, setMaintenanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // データ取得
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // 車両データを取得
        const vehicleResponse = await fetch(`${API_BASE_URL}/vehicles/${id}/`);
        
        if (!vehicleResponse.ok) {
          throw new Error(`車両データ取得エラー: ${vehicleResponse.status}`);
        }
        
        const vehicleData = await vehicleResponse.json();
        setVehicle(vehicleData);
        
        // 整備履歴を取得
        try {
          const maintenanceResponse = await fetch(
            `${API_BASE_URL}/maintenance/vehicles/${id}/schedules/`
          );
          
          if (maintenanceResponse.ok) {
            const maintenanceData = await maintenanceResponse.json();
            setMaintenanceRecords(maintenanceData);
          }
        } catch (err) {
          console.warn('整備履歴の取得に失敗しました。', err);
        }
        
        setError(null);
      } catch (err) {
        console.error('車両データの取得に失敗しました:', err);
        setError(`車両データの取得に失敗しました。${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    
    if (id) {
      fetchData();
    }
  }, [id]);
  
  // 年式のフォーマット
  const formatRegistrationDate = (yearValue) => {
    if (!yearValue) return '不明';
    
    const value = String(yearValue).padStart(4, '0');
    
    if (value.length !== 4) return value;
    
    const yearPart = value.substring(0, 2);
    const monthPart = value.substring(2, 4);
    
    // 西暦を計算（00-99 → 2000-2099）
    let fullYear;
    if (parseInt(yearPart, 10) < 80) {
      fullYear = 2000 + parseInt(yearPart, 10);
    } else {
      fullYear = 1900 + parseInt(yearPart, 10);
    }
    
    // 日本語形式に変換
    return `${fullYear}年${monthPart}月`;
  };
  
  // ナンバープレートのフォーマット
  const formatPlate = (plate) => {
    if (!plate) return '未登録';
    return plate.replace(/\s+/g, ' ').replace(/\n/g, '').trim();
  };
  
  // 日付のフォーマット
  const formatDate = (dateValue) => {
    if (!dateValue) return '-';
    // 日付が数値形式（例: 20250620）の場合の処理
    if (typeof dateValue === 'number') {
      const dateStr = dateValue.toString();
      if (dateStr.length === 8) {
        const year = dateStr.slice(0, 4);
        const month = dateStr.slice(4, 6);
        const day = dateStr.slice(6, 8);
        return `${year}年${month}月${day}日`;
      }
    }
    return dateValue;
  };
  
  // 車検期限までの日数を計算
  const getExpiryDaysLeft = (expiryDate) => {
    if (!expiryDate) return null;
    
    const dateStr = expiryDate.toString();
    if (dateStr.length !== 8) return null;
    
    try {
      const year = parseInt(dateStr.slice(0, 4));
      const month = parseInt(dateStr.slice(4, 6)) - 1; // 月は0から始まる
      const day = parseInt(dateStr.slice(6, 8));
      
      const expiry = new Date(year, month, day);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const diffTime = expiry.getTime() - today.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } catch (e) {
      return null;
    }
  };
  
  if (loading) {
    return (
      <div className="text-center p-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">読み込み中...</span>
        </Spinner>
        <p className="mt-2">車両データを読み込んでいます...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <Alert variant="danger">
        <Alert.Heading>エラーが発生しました</Alert.Heading>
        <p>{error}</p>
        <hr />
        <div className="d-flex justify-content-between">
          <Link href="/vehicles">
            <Button variant="outline-primary">車両一覧に戻る</Button>
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
  
  if (!vehicle) {
    return (
      <Alert variant="warning">
        <Alert.Heading>車両が見つかりません</Alert.Heading>
        <p>指定された車両ID ({id}) の情報が見つかりませんでした。</p>
        <hr />
        <div className="d-flex justify-content-start">
          <Link href="/vehicles">
            <Button variant="outline-primary">車両一覧に戻る</Button>
          </Link>
        </div>
      </Alert>
    );
  }

  // 車検期限の日数
  const expiryDaysLeft = getExpiryDaysLeft(vehicle.expiry_date);
  
  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1>{formatPlate(vehicle.plate) || `車両ID: ${id}`}</h1>
          <p className="text-muted mb-0">車台番号: {vehicle.type || '未登録'}</p>
        </div>
        <div className="d-flex gap-2">
          <Link href="/vehicles">
            <Button variant="outline-secondary">車両一覧に戻る</Button>
          </Link>
          <Link href={`/vehicles/${id}/edit`}>
            <Button variant="warning">編集</Button>
          </Link>
          <Link href={`/maintenance/schedule/new?vehicle_id=${id}`}>
            <Button variant="primary">整備登録</Button>
          </Link>
        </div>
      </div>
      
      <Tabs defaultActiveKey="info" className="mb-4">
        <Tab eventKey="info" title="基本情報">
          <Row>
            <Col md={8}>
              <Card className="mb-4">
                <Card.Header>
                  <h5 className="mb-0">車両情報</h5>
                </Card.Header>
                <Card.Body>
                  <Table bordered responsive>
                    <tbody>
                      <tr>
                        <th style={{ width: '30%' }}>車両番号（型式）</th>
                        <td>{vehicle.number || '-'}</td>
                      </tr>
                      <tr>
                        <th>ナンバープレート</th>
                        <td>{formatPlate(vehicle.plate)}</td>
                      </tr>
                      <tr>
                        <th>車台番号</th>
                        <td>{vehicle.type || '-'}</td>
                      </tr>
                      <tr>
                        <th>メーカー</th>
                        <td>{vehicle.manufacturer || '-'}</td>
                      </tr>
                      <tr>
                        <th>エンジン型式</th>
                        <td>{vehicle.model || '-'}</td>
                      </tr>
                      <tr>
                        <th>初年度登録</th>
                        <td>{formatRegistrationDate(vehicle.year)}</td>
                      </tr>
                      <tr>
                        <th>状態</th>
                        <td>
                          <Badge bg={
                            vehicle.status === '運行中' ? 'success' : 
                            vehicle.status === '整備中' ? 'warning' : 
                            vehicle.status === '待機中' ? 'info' : 'secondary'
                          }>
                            {vehicle.status || '不明'}
                          </Badge>
                        </td>
                      </tr>
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
              
              {/* 追加情報 */}
              <Card className="mb-4">
                <Card.Header>
                  <h5 className="mb-0">追加情報</h5>
                </Card.Header>
                <Card.Body>
                  <Table bordered responsive>
                    <tbody>
                      {vehicle.expiry_date && (
                        <tr>
                          <th style={{ width: '30%' }}>車検期限</th>
                          <td>{formatDate(vehicle.expiry_date)}</td>
                        </tr>
                      )}
                      {/* その他の追加情報 */}
                      {Object.entries(vehicle)
                        .filter(([key]) => ![
                          'id', 'number', 'plate', 'type', 'manufacturer', 
                          'model', 'year', 'status', 'expiry_date'
                        ].includes(key) && vehicle[key] !== null)
                        .map(([key, value]) => (
                          <tr key={key}>
                            <th style={{ width: '30%' }}>{key}</th>
                            <td>{typeof value === 'object' ? JSON.stringify(value) : value.toString()}</td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            </Col>
            
            <Col md={4}>
              {/* 車検アラート */}
              {vehicle.expiry_date && (
                <Card className={
                  expiryDaysLeft < 0 ? 'mb-4 border-danger' :
                  expiryDaysLeft < 30 ? 'mb-4 border-warning' :
                  'mb-4 border-info'
                }>
                  <Card.Header className={
                    expiryDaysLeft < 0 ? 'bg-danger bg-opacity-25' :
                    expiryDaysLeft < 30 ? 'bg-warning bg-opacity-25' :
                    'bg-info bg-opacity-25'
                  }>
                    <h5 className="mb-0">車検期限</h5>
                  </Card.Header>
                  <Card.Body>
                    <div className="text-center mb-3">
                      <h3>{formatDate(vehicle.expiry_date)}</h3>
                    </div>
                    
                    {expiryDaysLeft !== null && (
                      <div className="text-center">
                        <Badge bg={
                          expiryDaysLeft < 0 ? 'danger' :
                          expiryDaysLeft < 30 ? 'warning' :
                          'info'
                        } className="p-2">
                          {expiryDaysLeft < 0 
                            ? `車検期限切れ（${Math.abs(expiryDaysLeft)}日経過）` 
                            : `あと${expiryDaysLeft}日`}
                        </Badge>
                      </div>
                    )}
                    
                    {expiryDaysLeft !== null && expiryDaysLeft < 60 && (
                      <div className="d-grid mt-3">
                        <Link href={`/maintenance/schedule/new?vehicle_id=${id}`}>
                          <Button 
                            variant={expiryDaysLeft < 0 ? 'danger' : 'warning'} 
                            className="w-100"
                          >
                            車検予定を登録
                          </Button>
                        </Link>
                      </div>
                    )}
                  </Card.Body>
                </Card>
              )}
              
              {/* 整備履歴サマリー */}
              <Card className="mb-4">
                <Card.Header className="bg-secondary bg-opacity-25">
                  <h5 className="mb-0">整備履歴</h5>
                </Card.Header>
                <Card.Body>
                  <div className="mb-3">
                    <div className="d-flex justify-content-between mb-2">
                      <div>整備記録総数</div>
                      <div>{maintenanceRecords.length}件</div>
                    </div>
                    <div className="d-flex justify-content-between">
                      <div>最終整備日</div>
                      <div>
                        {maintenanceRecords.length > 0 
                          ? (maintenanceRecords[0].completion_date 
                              ? moment(maintenanceRecords[0].completion_date).format('YYYY/MM/DD')
                              : moment(maintenanceRecords[0].scheduled_date).format('YYYY/MM/DD'))
                          : '-'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="d-grid">
                    <Link href="#maintenance" className="text-decoration-none">
                      <Button variant="outline-secondary" className="w-100">
                        整備履歴を見る
                      </Button>
                    </Link>
                  </div>
                </Card.Body>
              </Card>
              
              {/* 車両ステータス */}
              <Card className={
                vehicle.status === '整備中' ? 'mb-4 border-warning' :
                vehicle.status === '運行中' ? 'mb-4 border-success' :
                'mb-4'
              }>
                <Card.Header className={
                  vehicle.status === '整備中' ? 'bg-warning bg-opacity-25' :
                  vehicle.status === '運行中' ? 'bg-success bg-opacity-25' :
                  'bg-light'
                }>
                  <h5 className="mb-0">車両状態</h5>
                </Card.Header>
                <Card.Body>
                  <div className="text-center mb-3">
                    <Badge bg={
                      vehicle.status === '運行中' ? 'success' : 
                      vehicle.status === '整備中' ? 'warning' : 
                      vehicle.status === '待機中' ? 'info' : 'secondary'
                    } className="p-2 fs-5">
                      {vehicle.status || '不明'}
                    </Badge>
                  </div>
                  
                  {vehicle.status === '整備中' && (
                    <div className="d-grid mt-3">
                      <Link href={`/maintenance/schedule/new?vehicle_id=${id}`}>
                        <Button variant="outline-warning" className="w-100">
                          整備記録を登録
                        </Button>
                      </Link>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>
        
        <Tab eventKey="maintenance" title="整備履歴">
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">整備記録</h5>
              <Link href={`/maintenance/schedule/new?vehicle_id=${id}`}>
                <Button variant="primary" size="sm">新規点検登録</Button>
              </Link>
            </Card.Header>
            <Card.Body>
              {maintenanceRecords.length === 0 ? (
                <Alert variant="info">
                  この車両の整備記録はまだありません。
                </Alert>
              ) : (
                <Table striped bordered hover responsive>
                  <thead>
                    <tr>
                      <th>日付</th>
                      <th>点検種類</th>
                      <th>状態</th>
                      <th>担当者</th>
                      <th>備考</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {maintenanceRecords
                      .sort((a, b) => new Date(b.scheduled_date) - new Date(a.scheduled_date))
                      .map(record => (
                        <tr key={record.id}>
                          <td>
                            {moment(record.scheduled_date).format('YYYY/MM/DD')}
                            {record.completion_date && 
                              <span className="text-success"> (完了: {moment(record.completion_date).format('YYYY/MM/DD')})</span>
                            }
                          </td>
                          <td>{record.maintenance_type.name}</td>
                          <td>
                            <Badge 
                              bg={
                                record.status.name === '完了' ? 'success' :
                                record.status.name === '予定' ? 'primary' :
                                record.status.name === '未実施' ? 'danger' : 'secondary'
                              }
                            >
                              {record.status.name}
                            </Badge>
                          </td>
                          <td>{record.technician || '-'}</td>
                          <td>{record.notes || '-'}</td>
                          <td>
                            <div className="d-flex gap-1">
                              <Link href={`/maintenance/schedule/${record.id}`}>
                                <Button size="sm" variant="info">詳細</Button>
                              </Link>
                              <Link href={`/maintenance/schedule/${record.id}/edit`}>
                                <Button size="sm" variant="warning">編集</Button>
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))
                    }
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>
    </div>
  );
}