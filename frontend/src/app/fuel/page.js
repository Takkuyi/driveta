// frontend/src/app/fuel/page.js
'use client';

import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Form, InputGroup, Alert, Spinner, Badge, Nav } from 'react-bootstrap';
import Link from 'next/link';
import moment from 'moment';
import 'moment/locale/ja';

// API基本URLを定義
const API_BASE_URL = 'http://127.0.0.1:5000/api';

moment.locale('ja');

export default function FuelManagementPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // ダッシュボードデータ
  const [dashboardData, setDashboardData] = useState({
    this_month: {},
    last_month: {},
    recent_records: [],
    top_vehicles: []
  });
  
  // 給油記録データ
  const [fuelRecords, setFuelRecords] = useState([]);
  const [pagination, setPagination] = useState({});
  
  // 統計データ
  const [statistics, setStatistics] = useState({
    statistics: [],
    summary: {}
  });
  
  // 車両・給油所データ
  const [vehicles, setVehicles] = useState([]);
  const [stations, setStations] = useState([]);
  
  // フィルター状態
  const [filters, setFilters] = useState({
    vehicle_number: '',
    start_date: moment().subtract(1, 'month').format('YYYY-MM-DD'),
    end_date: moment().format('YYYY-MM-DD'),
    fuel_station: '',
    page: 1
  });

  // データ取得関数
  const fetchDashboardData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/fuel/dashboard`);
      if (!response.ok) throw new Error(`ダッシュボードデータ取得エラー: ${response.status}`);
      const data = await response.json();
      setDashboardData(data);
    } catch (err) {
      console.error('ダッシュボードデータ取得エラー:', err);
      setError(err.message);
    }
  };

  const fetchFuelRecords = async () => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      
      const response = await fetch(`${API_BASE_URL}/fuel/records?${params}`);
      if (!response.ok) throw new Error(`給油記録取得エラー: ${response.status}`);
      const data = await response.json();
      setFuelRecords(data.records);
      setPagination(data.pagination);
    } catch (err) {
      console.error('給油記録取得エラー:', err);
      setError(err.message);
    }
  };

  const fetchStatistics = async () => {
    try {
      const params = new URLSearchParams({
        period: 'vehicle',
        start_date: filters.start_date,
        end_date: filters.end_date
      });
      
      const response = await fetch(`${API_BASE_URL}/fuel/statistics?${params}`);
      if (!response.ok) throw new Error(`統計データ取得エラー: ${response.status}`);
      const data = await response.json();
      setStatistics(data);
    } catch (err) {
      console.error('統計データ取得エラー:', err);
      setError(err.message);
    }
  };

  const fetchVehicles = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/fuel/vehicles`);
      if (!response.ok) throw new Error(`車両データ取得エラー: ${response.status}`);
      const data = await response.json();
      setVehicles(data);
    } catch (err) {
      console.error('車両データ取得エラー:', err);
    }
  };

  const fetchStations = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/fuel/stations`);
      if (!response.ok) throw new Error(`給油所データ取得エラー: ${response.status}`);
      const data = await response.json();
      setStations(data);
    } catch (err) {
      console.error('給油所データ取得エラー:', err);
    }
  };

  // 初期データ読み込み
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchDashboardData(),
        fetchVehicles(),
        fetchStations()
      ]);
      setLoading(false);
    };
    loadData();
  }, []);

  // タブ変更時のデータ読み込み
  useEffect(() => {
    if (activeTab === 'records') {
      fetchFuelRecords();
    } else if (activeTab === 'statistics') {
      fetchStatistics();
    }
  }, [activeTab, filters]);

  // フィルター変更ハンドラ
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value,
      page: 1 // ページをリセット
    }));
  };

  // フィルターリセット
  const resetFilters = () => {
    setFilters({
      vehicle_number: '',
      start_date: moment().subtract(1, 'month').format('YYYY-MM-DD'),
      end_date: moment().format('YYYY-MM-DD'),
      fuel_station: '',
      page: 1
    });
  };

  // ページ変更
  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
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

  return (
    <Container fluid>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>給油管理システム</h1>
        <div className="d-flex gap-2">
          <Link href="/fuel/import">
            <Button variant="success">CSVインポート</Button>
          </Link>
          <Button variant="outline-secondary" onClick={() => window.location.reload()}>
            データ更新
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="danger" className="mb-4">
          エラー: {error}
        </Alert>
      )}

      {/* タブナビゲーション */}
      <Nav variant="tabs" className="mb-4">
        <Nav.Item>
          <Nav.Link 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')}
          >
            ダッシュボード
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link 
            active={activeTab === 'records'} 
            onClick={() => setActiveTab('records')}
          >
            給油記録
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link 
            active={activeTab === 'statistics'} 
            onClick={() => setActiveTab('statistics')}
          >
            統計・分析
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link 
            active={activeTab === 'vehicles'} 
            onClick={() => setActiveTab('vehicles')}
          >
            車両別実績
          </Nav.Link>
        </Nav.Item>
      </Nav>

      {/* ダッシュボードタブ */}
      {activeTab === 'dashboard' && (
        <div>
          {/* 月次サマリー */}
          <Row className="mb-4">
            <Col md={3}>
              <Card className="border-primary">
                <Card.Body>
                  <div className="d-flex justify-content-between">
                    <div>
                      <Card.Title className="text-muted">今月給油量</Card.Title>
                      <Card.Text className="fs-3 fw-bold">
                        {dashboardData.this_month.quantity?.toLocaleString() || 0}L
                      </Card.Text>
                    </div>
                    <div className="fs-1 text-muted">⛽</div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
            
            <Col md={3}>
              <Card className="border-success">
                <Card.Body>
                  <div className="d-flex justify-content-between">
                    <div>
                      <Card.Title className="text-muted">今月給油代</Card.Title>
                      <Card.Text className="fs-3 fw-bold">
                        ¥{dashboardData.this_month.amount?.toLocaleString() || 0}
                      </Card.Text>
                    </div>
                    <div className="fs-1 text-muted">💰</div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
            
            <Col md={3}>
              <Card className="border-info">
                <Card.Body>
                  <div className="d-flex justify-content-between">
                    <div>
                      <Card.Title className="text-muted">今月給油回数</Card.Title>
                      <Card.Text className="fs-3 fw-bold">
                        {dashboardData.this_month.count || 0}回
                      </Card.Text>
                    </div>
                    <div className="fs-1 text-muted">📊</div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
            
            <Col md={3}>
              <Card className="border-warning">
                <Card.Body>
                  <div className="d-flex justify-content-between">
                    <div>
                      <Card.Title className="text-muted">稼働車両数</Card.Title>
                      <Card.Text className="fs-3 fw-bold">
                        {dashboardData.this_month.vehicles || 0}台
                      </Card.Text>
                    </div>
                    <div className="fs-1 text-muted">🚚</div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row>
            {/* 最近の給油記録 */}
            <Col md={8}>
              <Card>
                <Card.Header>
                  <h5 className="mb-0">最近の給油記録</h5>
                </Card.Header>
                <Card.Body>
                  <Table striped hover responsive>
                    <thead>
                      <tr>
                        <th>日付</th>
                        <th>車番</th>
                        <th>給油所</th>
                        <th>給油量</th>
                        <th>金額</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardData.recent_records.map((record, index) => (
                        <tr key={index}>
                          <td>{moment(record.transaction_date).format('MM/DD')}</td>
                          <td>{record.vehicle_number}</td>
                          <td>{record.fuel_station_name || '-'}</td>
                          <td>{record.quantity}L</td>
                          <td>¥{record.product_amount?.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            </Col>

            {/* 車両別給油量トップ5 */}
            <Col md={4}>
              <Card>
                <Card.Header>
                  <h5 className="mb-0">今月給油量トップ5</h5>
                </Card.Header>
                <Card.Body>
                  {dashboardData.top_vehicles.map((vehicle, index) => (
                    <div key={index} className="d-flex justify-content-between align-items-center mb-2">
                      <div>
                        <Badge bg={index === 0 ? 'warning' : index === 1 ? 'secondary' : index === 2 ? 'dark' : 'light'}>
                          {index + 1}
                        </Badge>
                        <span className="ms-2">{vehicle.vehicle_number}</span>
                      </div>
                      <div>
                        <span className="fw-bold">{vehicle.quantity}L</span>
                        <br />
                        <small className="text-muted">¥{vehicle.amount.toLocaleString()}</small>
                      </div>
                    </div>
                  ))}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </div>
      )}

      {/* 給油記録タブ */}
      {activeTab === 'records' && (
        <div>
          {/* フィルター */}
          <Card className="mb-4">
            <Card.Body>
              <Row>
                <Col md={3}>
                  <Form.Group>
                    <Form.Label>車番</Form.Label>
                    <Form.Control
                      type="text"
                      name="vehicle_number"
                      value={filters.vehicle_number}
                      onChange={handleFilterChange}
                      placeholder="車番で検索"
                    />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group>
                    <Form.Label>開始日</Form.Label>
                    <Form.Control
                      type="date"
                      name="start_date"
                      value={filters.start_date}
                      onChange={handleFilterChange}
                    />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group>
                    <Form.Label>終了日</Form.Label>
                    <Form.Control
                      type="date"
                      name="end_date"
                      value={filters.end_date}
                      onChange={handleFilterChange}
                    />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group>
                    <Form.Label>給油所</Form.Label>
                    <Form.Control
                      type="text"
                      name="fuel_station"
                      value={filters.fuel_station}
                      onChange={handleFilterChange}
                      placeholder="給油所名で検索"
                    />
                  </Form.Group>
                </Col>
              </Row>
              <div className="mt-3">
                <Button variant="primary" className="me-2">
                  検索
                </Button>
                <Button variant="outline-secondary" onClick={resetFilters}>
                  リセット
                </Button>
              </div>
            </Card.Body>
          </Card>

          {/* 給油記録テーブル */}
          <Card>
            <Card.Header>
              <h5 className="mb-0">給油記録一覧</h5>
            </Card.Header>
            <Card.Body>
              <Table striped bordered hover responsive>
                <thead>
                  <tr>
                    <th>取引日</th>
                    <th>車番</th>
                    <th>給油所</th>
                    <th>商品名</th>
                    <th>給油量</th>
                    <th>単価</th>
                    <th>金額</th>
                    <th>消費税</th>
                    <th>軽油税</th>
                  </tr>
                </thead>
                <tbody>
                  {fuelRecords.map((record) => (
                    <tr key={record.id}>
                      <td>{moment(record.transaction_date).format('YYYY/MM/DD')}</td>
                      <td>{record.vehicle_number}</td>
                      <td>{record.fuel_station_name || '-'}</td>
                      <td>{record.product_name || '-'}</td>
                      <td className="text-end">{record.quantity}L</td>
                      <td className="text-end">¥{record.unit_price?.toFixed(2)}</td>
                      <td className="text-end">¥{record.product_amount?.toLocaleString()}</td>
                      <td className="text-end">¥{record.consumption_tax?.toLocaleString()}</td>
                      <td className="text-end">¥{record.diesel_tax?.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>

              {/* ページネーション */}
              {pagination.pages > 1 && (
                <div className="d-flex justify-content-between align-items-center mt-3">
                  <div>
                    {pagination.total}件中 {(pagination.page - 1) * pagination.per_page + 1}～
                    {Math.min(pagination.page * pagination.per_page, pagination.total)}件表示
                  </div>
                  <div>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      disabled={!pagination.has_prev}
                      onClick={() => handlePageChange(pagination.page - 1)}
                      className="me-2"
                    >
                      前へ
                    </Button>
                    <span className="mx-2">
                      {pagination.page} / {pagination.pages}
                    </span>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      disabled={!pagination.has_next}
                      onClick={() => handlePageChange(pagination.page + 1)}
                    >
                      次へ
                    </Button>
                  </div>
                </div>
              )}
            </Card.Body>
          </Card>
        </div>
      )}

      {/* 統計・分析タブ */}
      {activeTab === 'statistics' && (
        <div>
          <Row>
            <Col md={4}>
              <Card className="mb-4">
                <Card.Header>
                  <h5 className="mb-0">期間統計</h5>
                </Card.Header>
                <Card.Body>
                  <div className="mb-3">
                    <div className="d-flex justify-content-between">
                      <span>総給油量:</span>
                      <span className="fw-bold">{statistics.summary.total_quantity?.toLocaleString() || 0}L</span>
                    </div>
                  </div>
                  <div className="mb-3">
                    <div className="d-flex justify-content-between">
                      <span>総金額:</span>
                      <span className="fw-bold">¥{statistics.summary.total_amount?.toLocaleString() || 0}</span>
                    </div>
                  </div>
                  <div className="mb-3">
                    <div className="d-flex justify-content-between">
                      <span>平均単価:</span>
                      <span className="fw-bold">¥{statistics.summary.avg_unit_price?.toFixed(2) || 0}</span>
                    </div>
                  </div>
                  <div className="mb-3">
                    <div className="d-flex justify-content-between">
                      <span>給油回数:</span>
                      <span className="fw-bold">{statistics.summary.total_records || 0}回</span>
                    </div>
                  </div>
                  <div>
                    <div className="d-flex justify-content-between">
                      <span>対象車両数:</span>
                      <span className="fw-bold">{statistics.summary.vehicle_count || 0}台</span>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col md={8}>
              <Card>
                <Card.Header>
                  <h5 className="mb-0">車両別給油実績</h5>
                </Card.Header>
                <Card.Body>
                  <Table striped hover responsive>
                    <thead>
                      <tr>
                        <th>車番</th>
                        <th>給油量</th>
                        <th>金額</th>
                        <th>回数</th>
                        <th>平均単価</th>
                        <th>最終給油日</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statistics.statistics.map((stat, index) => (
                        <tr key={index}>
                          <td>{stat.vehicle_number}</td>
                          <td className="text-end">{stat.total_quantity?.toFixed(1)}L</td>
                          <td className="text-end">¥{stat.total_amount?.toLocaleString()}</td>
                          <td className="text-end">{stat.record_count}回</td>
                          <td className="text-end">¥{stat.avg_unit_price?.toFixed(2)}</td>
                          <td>{moment(stat.last_date).format('YYYY/MM/DD')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </div>
      )}

      {/* 車両別実績タブ */}
      {activeTab === 'vehicles' && (
        <div>
          <Card>
            <Card.Header>
              <h5 className="mb-0">車両別給油実績</h5>
            </Card.Header>
            <Card.Body>
              <Table striped hover responsive>
                <thead>
                  <tr>
                    <th>車番</th>
                    <th>総給油量</th>
                    <th>総金額</th>
                    <th>給油回数</th>
                    <th>平均単価</th>
                    <th>初回給油日</th>
                    <th>最終給油日</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map((vehicle, index) => (
                    <tr key={index}>
                      <td>{vehicle.vehicle_number}</td>
                      <td className="text-end">{vehicle.total_quantity?.toFixed(1)}L</td>
                      <td className="text-end">¥{vehicle.total_amount?.toLocaleString()}</td>
                      <td className="text-end">{vehicle.fuel_count}回</td>
                      <td className="text-end">¥{vehicle.avg_unit_price?.toFixed(2)}</td>
                      <td>{moment(vehicle.first_fuel_date).format('YYYY/MM/DD')}</td>
                      <td>{moment(vehicle.last_fuel_date).format('YYYY/MM/DD')}</td>
                      <td>
                        <Link href={`/fuel/vehicles/${vehicle.vehicle_number}`}>
                          <Button size="sm" variant="info">詳細</Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </div>
      )}
    </Container>
  );
}