// frontend/src/app/etc-records/statistics/page.js
'use client';

import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Form, Button, Alert, Spinner, Badge } from 'react-bootstrap';
import Link from 'next/link';
import moment from 'moment';
import 'moment/locale/ja';

// API基本URLを定義
const API_BASE_URL = 'http://127.0.0.1:5000/api';

moment.locale('ja');

export default function ETCStatisticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // フィルター状態
  const [filters, setFilters] = useState({
    start_date: moment().subtract(3, 'months').format('YYYY-MM-DD'),
    end_date: moment().format('YYYY-MM-DD'),
    vehicle_number: ''
  });
  
  // 統計データ
  const [statistics, setStatistics] = useState({
    summary: {
      total_usage: 0,
      total_amount: 0,
      total_discount: 0,
      average_amount: 0
    },
    vehicle_stats: [],
    monthly_stats: []
  });
  
  const [vehicleSummary, setVehicleSummary] = useState([]);

  // データ取得
  const fetchStatistics = async () => {
    try {
      setLoading(true);
      
      // クエリパラメータの構築
      const params = new URLSearchParams();
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
      if (filters.vehicle_number) params.append('vehicle_number', filters.vehicle_number);
      
      // 統計情報を取得
      const [statsResponse, vehicleResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/etc/statistics?${params.toString()}`),
        fetch(`${API_BASE_URL}/etc/vehicle-summary?${params.toString()}`)
      ]);
      
      if (!statsResponse.ok || !vehicleResponse.ok) {
        throw new Error('統計データの取得に失敗しました');
      }
      
      const statsData = await statsResponse.json();
      const vehicleData = await vehicleResponse.json();
      
      setStatistics(statsData);
      setVehicleSummary(vehicleData);
      setError(null);
    } catch (err) {
      console.error('統計データの取得に失敗しました:', err);
      setError(`統計データの取得に失敗しました。${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 初回データ取得
  useEffect(() => {
    fetchStatistics();
  }, []);

  // フィルター変更ハンドラ
  const handleFilterChange = (name, value) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // 検索実行
  const handleSearch = () => {
    fetchStatistics();
  };

  // フィルタークリア
  const handleClearFilters = () => {
    setFilters({
      start_date: moment().subtract(3, 'months').format('YYYY-MM-DD'),
      end_date: moment().format('YYYY-MM-DD'),
      vehicle_number: ''
    });
  };

  // 金額フォーマット
  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '-';
    return `¥${amount.toLocaleString()}`;
  };

  // パーセンテージ計算
  const calculatePercentage = (part, total) => {
    if (total === 0) return 0;
    return ((part / total) * 100).toFixed(1);
  };

  if (loading) {
    return (
      <div className="text-center p-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">読み込み中...</span>
        </Spinner>
        <p className="mt-2">統計データを読み込んでいます...</p>
      </div>
    );
  }

  return (
    <Container fluid>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>ETC利用統計</h1>
        <Link href="/etc-records">
          <Button variant="outline-secondary">一覧に戻る</Button>
        </Link>
      </div>

      {/* フィルターエリア */}
      <Card className="mb-4">
        <Card.Body>
          <Row>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>開始日</Form.Label>
                <Form.Control
                  type="date"
                  value={filters.start_date}
                  onChange={(e) => handleFilterChange('start_date', e.target.value)}
                />
              </Form.Group>
            </Col>
            
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>終了日</Form.Label>
                <Form.Control
                  type="date"
                  value={filters.end_date}
                  onChange={(e) => handleFilterChange('end_date', e.target.value)}
                />
              </Form.Group>
            </Col>
            
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>車両番号</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="車両番号で絞り込み"
                  value={filters.vehicle_number}
                  onChange={(e) => handleFilterChange('vehicle_number', e.target.value)}
                />
              </Form.Group>
            </Col>
            
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>&nbsp;</Form.Label>
                <div className="d-grid gap-2">
                  <Button variant="primary" onClick={handleSearch}>
                    統計更新
                  </Button>
                  <Button variant="outline-secondary" onClick={handleClearFilters}>
                    リセット
                  </Button>
                </div>
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {error && (
        <Alert variant="danger" className="mb-4">
          <Alert.Heading>エラーが発生しました</Alert.Heading>
          {error}
        </Alert>
      )}

      {/* 全体サマリー */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="border-primary mb-3 h-100">
            <Card.Body>
              <div className="d-flex justify-content-between">
                <div>
                  <Card.Title className="text-muted">総利用回数</Card.Title>
                  <Card.Text className="fs-3 fw-bold">{statistics.summary.total_usage}</Card.Text>
                </div>
                <div className="fs-1 text-muted">🛣️</div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={3}>
          <Card className="border-success mb-3 h-100">
            <Card.Body>
              <div className="d-flex justify-content-between">
                <div>
                  <Card.Title className="text-muted">総利用金額</Card.Title>
                  <Card.Text className="fs-3 fw-bold">{formatCurrency(statistics.summary.total_amount)}</Card.Text>
                </div>
                <div className="fs-1 text-muted">💰</div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={3}>
          <Card className="border-info mb-3 h-100">
            <Card.Body>
              <div className="d-flex justify-content-between">
                <div>
                  <Card.Title className="text-muted">総割引額</Card.Title>
                  <Card.Text className="fs-3 fw-bold">{formatCurrency(statistics.summary.total_discount)}</Card.Text>
                </div>
                <div className="fs-1 text-muted">🎫</div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={3}>
          <Card className="border-warning mb-3 h-100">
            <Card.Body>
              <div className="d-flex justify-content-between">
                <div>
                  <Card.Title className="text-muted">平均利用金額</Card.Title>
                  <Card.Text className="fs-3 fw-bold">{formatCurrency(Math.round(statistics.summary.average_amount))}</Card.Text>
                </div>
                <div className="fs-1 text-muted">📊</div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        {/* 車両別利用状況 */}
        <Col md={8}>
          <Card className="mb-4">
            <Card.Header className="bg-primary text-white">
              <h5 className="mb-0">🚚 車両別ETC利用状況</h5>
            </Card.Header>
            <Card.Body>
              {vehicleSummary.length === 0 ? (
                <div className="text-center p-4">
                  <p className="text-muted">データがありません</p>
                </div>
              ) : (
                <Table striped bordered hover responsive>
                  <thead>
                    <tr>
                      <th>車両番号</th>
                      <th>利用回数</th>
                      <th>総利用金額</th>
                      <th>総割引額</th>
                      <th>平均金額</th>
                      <th>最終利用日</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vehicleSummary.map((vehicle, index) => (
                      <tr key={vehicle.vehicle_number}>
                        <td>
                          <div>
                            <strong>{vehicle.vehicle_number}</strong>
                          </div>
                        </td>
                        <td>
                          <strong>{vehicle.usage_count}</strong>回
                          <br />
                          <small className="text-muted">
                            ({calculatePercentage(vehicle.usage_count, statistics.summary.total_usage)}%)
                          </small>
                        </td>
                        <td>
                          <strong>{formatCurrency(vehicle.total_amount)}</strong>
                          <br />
                          <small className="text-muted">
                            ({calculatePercentage(vehicle.total_amount, statistics.summary.total_amount)}%)
                          </small>
                        </td>
                        <td>
                          <span className="text-success">
                            {formatCurrency(vehicle.total_discount)}
                          </span>
                        </td>
                        <td>
                          {formatCurrency(Math.round(vehicle.average_amount))}
                        </td>
                        <td>
                          {vehicle.last_usage_date 
                            ? moment(vehicle.last_usage_date).format('YYYY/MM/DD')
                            : '-'
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* 月別利用状況 */}
        <Col md={4}>
          <Card className="mb-4">
            <Card.Header className="bg-info text-white">
              <h5 className="mb-0">📅 月別利用状況</h5>
            </Card.Header>
            <Card.Body>
              {statistics.monthly_stats.length === 0 ? (
                <div className="text-center p-4">
                  <p className="text-muted">データがありません</p>
                </div>
              ) : (
                <Table striped bordered hover responsive size="sm">
                  <thead>
                    <tr>
                      <th>月</th>
                      <th>回数</th>
                      <th>金額</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statistics.monthly_stats.map((month) => (
                      <tr key={month.month}>
                        <td>
                          <strong>{moment(month.month).format('YYYY年MM月')}</strong>
                        </td>
                        <td>
                          {month.usage_count}回
                        </td>
                        <td>
                          {formatCurrency(month.total_amount)}
                          {month.total_discount > 0 && (
                            <div className="text-success small">
                              割引: {formatCurrency(month.total_discount)}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* 利用傾向分析 */}
      <Row>
        <Col md={6}>
          <Card className="mb-4">
            <Card.Header className="bg-success text-white">
              <h5 className="mb-0">💡 利用傾向分析</h5>
            </Card.Header>
            <Card.Body>
              {statistics.summary.total_usage > 0 ? (
                <div>
                  <div className="mb-3">
                    <h6>割引効果</h6>
                    <p>
                      総利用金額から<strong className="text-success">
                        {formatCurrency(statistics.summary.total_discount)}
                      </strong>の割引を受けています。
                      <br />
                      <small className="text-muted">
                        割引率: {calculatePercentage(statistics.summary.total_discount, statistics.summary.total_amount + statistics.summary.total_discount)}%
                      </small>
                    </p>
                  </div>
                  
                  <div className="mb-3">
                    <h6>平均利用状況</h6>
                    <p>
                      1回あたりの平均利用金額: <strong>{formatCurrency(Math.round(statistics.summary.average_amount))}</strong>
                      <br />
                      <small className="text-muted">
                        月平均利用回数: {Math.round(statistics.summary.total_usage / Math.max(statistics.monthly_stats.length, 1))}回
                      </small>
                    </p>
                  </div>

                  {vehicleSummary.length > 0 && (
                    <div>
                      <h6>最も利用頻度の高い車両</h6>
                      <p>
                        <strong>{vehicleSummary[0].vehicle_number}</strong>
                        <br />
                        <small className="text-muted">
                          {vehicleSummary[0].usage_count}回利用 
                          ({formatCurrency(vehicleSummary[0].total_amount)})
                        </small>
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted">分析するデータがありません</p>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col md={6}>
          <Card className="mb-4">
            <Card.Header className="bg-warning text-dark">
              <h5 className="mb-0">📈 改善提案</h5>
            </Card.Header>
            <Card.Body>
              <div>
                <h6>コスト削減のヒント</h6>
                <ul>
                  <li>ETC深夜割引（0-4時）の活用を検討</li>
                  <li>ETC休日割引の利用機会を増やす</li>
                  <li>効率的なルート選択での通行料削減</li>
                  <li>ETCマイレージサービスの登録確認</li>
                </ul>
                
                <h6 className="mt-3">運用改善</h6>
                <ul>
                  <li>利用頻度の低い車両の見直し</li>
                  <li>ピーク時間帯の運行スケジュール調整</li>
                  <li>定期的な通行ルートの最適化</li>
                </ul>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}