'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Table, Button, Badge, Card, Form, InputGroup, Spinner, Alert } from 'react-bootstrap';
import { formatRegistrationDate, formatPlate } from '@/utils/formatters';

export default function VehiclesPage() {
  // 状態管理
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // APIからデータを取得
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        setLoading(true);
        // APIエンドポイントからデータを取得
        const response = await fetch('http://127.0.0.1:5000/api/vehicles/');
        
        if (!response.ok) {
          throw new Error(`APIエラー: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('API レスポンス:', data); // デバッグ用
        setVehicles(data);
        setError(null);
      } catch (err) {
        console.error('車両データの取得に失敗しました:', err);
        setError(`車両データの取得に失敗しました。${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchVehicles();
  }, []); // 空の依存配列でコンポーネントマウント時に1回だけ実行

  // 車両データの表示用に整形
  const formatYear = (yearValue) => {
    // 年数の形式を修正（例: 405が2005年を表す場合の対応など）
    if (!yearValue) return '不明';
    if (yearValue < 1000) return `20${yearValue}`; // 2桁または3桁の場合の処理
    return yearValue;
  };

  const formatPlate = (plate) => {
    if (!plate) return '未登録';
    // 余分な空白と改行を削除
    return plate.replace(/\s+/g, ' ').replace(/\n/g, '').trim();
  };

  // フィルター適用後の車両リスト
  const filteredVehicles = vehicles.filter(vehicle => {
    // 検索条件のフィルタリング（null チェックを含む）
    const numberMatch = vehicle.number && vehicle.number.toLowerCase().includes(searchTerm.toLowerCase());
    const plateMatch = vehicle.plate && vehicle.plate.toLowerCase().includes(searchTerm.toLowerCase());
    const manufacturerMatch = vehicle.manufacturer && vehicle.manufacturer.toLowerCase().includes(searchTerm.toLowerCase());
    const modelMatch = vehicle.model && vehicle.model.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSearch = 
      searchTerm === '' || numberMatch || plateMatch || manufacturerMatch || modelMatch;
    
    // ステータスフィルタリング
    const matchesStatus = statusFilter === 'all' || vehicle.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // 利用可能なステータス値を抽出
  const availableStatuses = [...new Set(vehicles.filter(v => v.status).map(v => v.status))];

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
              {availableStatuses.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </Form.Select>
          </div>
        </div>
      </div>

      <Card>
        <Card.Body>
          {loading ? (
            <div className="text-center p-5">
              <Spinner animation="border" role="status">
                <span className="visually-hidden">読み込み中...</span>
              </Spinner>
              <p className="mt-2">車両データを読み込んでいます...</p>
            </div>
          ) : error ? (
            <Alert variant="danger">
              <Alert.Heading>エラーが発生しました</Alert.Heading>
              <p>{error}</p>
              <hr />
              <div className="d-flex justify-content-end">
                <Button 
                  variant="outline-danger" 
                  onClick={() => window.location.reload()}
                >
                  再試行
                </Button>
              </div>
            </Alert>
          ) : filteredVehicles.length === 0 ? (
            <div className="text-center p-4">
              <p className="text-muted">
                {vehicles.length === 0 
                  ? '車両データがありません。新規車両を登録してください。' 
                  : '条件に一致する車両がありません。'}
              </p>
            </div>
          ) : (
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>車両番号</th>
                  <th>ナンバープレート</th>
                  <th>メーカー/型式</th>
                  <th>年式</th>
                  <th>状態</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredVehicles.map((vehicle) => (
                  <tr key={vehicle.id}>
                    <td>{vehicle.number || '未登録'}</td>
                    <td>{formatPlate(vehicle.plate)}</td>
                    <td>
                      {vehicle.manufacturer && 
                        <span>{vehicle.manufacturer} </span>
                      }
                      {vehicle.model}
                    </td>
                    <td>{formatRegistrationDate(vehicle.year)}</td>
                    <td>
                      <Badge bg={
                        vehicle.status === '運行中' ? 'success' : 
                        vehicle.status === '減車済み' ? 'warning' : 
                        vehicle.status === '売却済み' ? 'info' : 'secondary'
                      }>
                        {vehicle.status || '不明'}
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