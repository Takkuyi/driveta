// frontend/src/app/etc-records/page.js
'use client';

import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Form, Button, InputGroup, Alert, Spinner, Pagination, Badge } from 'react-bootstrap';
import Link from 'next/link';
import moment from 'moment';
import 'moment/locale/ja';

// API基本URLを定義
const API_BASE_URL = 'http://127.0.0.1:5000/api';

moment.locale('ja');

export default function ETCRecordsPage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // フィルター・検索状態
  const [filters, setFilters] = useState({
    vehicle_number: '',
    start_date: '',
    end_date: '',
    page: 1,
    per_page: 20
  });
  
  // ページネーション状態
  const [pagination, setPagination] = useState({
    page: 1,
    per_page: 20,
    total: 0,
    pages: 1,
    has_next: false,
    has_prev: false
  });
  
  // 統計情報
  const [summary, setSummary] = useState({
    total_usage: 0,
    total_amount: 0,
    total_discount: 0,
    average_amount: 0
  });

  // データ取得
  const fetchETCRecords = async () => {
    try {
      setLoading(true);
      
      // クエリパラメータの構築
      const params = new URLSearchParams();
      if (filters.vehicle_number) params.append('vehicle_number', filters.vehicle_number);
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
      params.append('page', filters.page.toString());
      params.append('per_page', filters.per_page.toString());
      
      // ETC利用データを取得
      const response = await fetch(`${API_BASE_URL}/etc/usage?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`APIエラー: ${response.status}`);
      }
      
      const data = await response.json();
      setRecords(data.data || []);
      setPagination(data.pagination || {});
      
      // 統計情報を取得
      const statsParams = new URLSearchParams();
      if (filters.vehicle_number) statsParams.append('vehicle_number', filters.vehicle_number);
      if (filters.start_date) statsParams.append('start_date', filters.start_date);
      if (filters.end_date) statsParams.append('end_date', filters.end_date);
      
      const statsResponse = await fetch(`${API_BASE_URL}/etc/statistics?${statsParams.toString()}`);
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setSummary(statsData.summary || {});
      }
      
      setError(null);
    } catch (err) {
      console.error('ETC記録の取得に失敗しました:', err);
      setError(`ETC記録の取得に失敗しました。${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 初回データ取得
  useEffect(() => {
    fetchETCRecords();
  }, [filters.page]); // ページ変更時のみ自動取得

  // フィルター変更ハンドラ
  const handleFilterChange = (name, value) => {
    setFilters(prev => ({
      ...prev,
      [name]: value,
      page: 1 // フィルター変更時はページを1に戻す
    }));
  };

  // 検索実行
  const handleSearch = () => {
    fetchETCRecords();
  };

  // フィルタークリア
  const handleClearFilters = () => {
    setFilters({
      vehicle_number: '',
      start_date: '',
      end_date: '',
      page: 1,
      per_page: 20
    });
  };

  // ページ変更ハンドラ
  const handlePageChange = (page) => {
    setFilters(prev => ({ ...prev, page }));
  };

  // 金額フォーマット
  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '-';
    return `¥${amount.toLocaleString()}`;
  };

  // 利用日時表示用のヘルパー関数
  const formatUsageDateTime = (record) => {
    // 開始日時と終了日時を取得（開始がnullの場合は終了を使用）
    const startDate = record.start_date || record.end_date;
    const endDate = record.end_date;
    const startTime = record.start_time || record.end_time;
    const endTime = record.end_time;
    
    // 日付が同じ場合とそうでない場合で表示を分ける
    if (startDate === endDate) {
      return (
        <div>
          <strong>{moment(startDate).format('YYYY/MM/DD')}</strong>
          <div className="text-muted small">
            {formatTime(startTime)} → {formatTime(endTime)}
          </div>
        </div>
      );
    } else {
      return (
        <div>
          <div>
            <strong>{moment(startDate).format('YYYY/MM/DD')}</strong>
            <small className="text-muted ms-1">{formatTime(startTime)}</small>
          </div>
          <div className="text-muted small">↓</div>
          <div>
            <strong>{moment(endDate).format('YYYY/MM/DD')}</strong>
            <small className="text-muted ms-1">{formatTime(endTime)}</small>
          </div>
        </div>
      );
    }
  };
  const formatICDisplay = (record) => {
    const departureIC = record.departure_ic || record.arrival_ic || '不明';
    const arrivalIC = record.arrival_ic || '不明';
    
    // 両方が同じ場合（日光本線料金所など）は一つだけ表示
    if (departureIC === arrivalIC) {
      return (
        <div className="text-center">
          <strong>{departureIC}</strong>
          <div className="text-muted small">（料金所）</div>
        </div>
      );
    }
    
    // 通常の区間移動の場合
    return (
      <div>
        <strong>{departureIC}</strong>
        <div className="text-muted small">↓</div>
        <strong>{arrivalIC}</strong>
      </div>
    );
  };

  // 時間フォーマット
  const formatTime = (time) => {
    if (!time) return '-';
    // HH:MM 形式に変換
    if (time.length === 4 && !time.includes(':')) {
      return `${time.slice(0, 2)}:${time.slice(2, 4)}`;
    }
    return time;
  };

  return (
    <Container fluid>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>ETC利用記録</h1>
        <div className="d-flex gap-2">
          <Link href="/etc-records/upload">
            <Button variant="primary">CSVアップロード</Button>
          </Link>
          <Link href="/etc-records/statistics">
            <Button variant="info">統計情報</Button>
          </Link>
        </div>
      </div>

      {/* 統計サマリー */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="border-primary mb-3 h-100">
            <Card.Body>
              <div className="d-flex justify-content-between">
                <div>
                  <Card.Title className="text-muted">総利用回数</Card.Title>
                  <Card.Text className="fs-4 fw-bold">{summary.total_usage}</Card.Text>
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
                  <Card.Text className="fs-4 fw-bold">{formatCurrency(summary.total_amount)}</Card.Text>
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
                  <Card.Text className="fs-4 fw-bold">{formatCurrency(summary.total_discount)}</Card.Text>
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
                  <Card.Text className="fs-4 fw-bold">{formatCurrency(Math.round(summary.average_amount))}</Card.Text>
                </div>
                <div className="fs-1 text-muted">📊</div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* 検索・フィルターエリア */}
      <Card className="mb-4">
        <Card.Body>
          <Row>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>車両番号</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="車両番号で検索"
                  value={filters.vehicle_number}
                  onChange={(e) => handleFilterChange('vehicle_number', e.target.value)}
                />
              </Form.Group>
            </Col>
            
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
                <Form.Label>&nbsp;</Form.Label>
                <div className="d-grid gap-2">
                  <Button variant="primary" onClick={handleSearch}>
                    検索
                  </Button>
                  {(filters.vehicle_number || filters.start_date || filters.end_date) && (
                    <Button variant="outline-secondary" onClick={handleClearFilters}>
                      クリア
                    </Button>
                  )}
                </div>
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* データテーブル */}
      <Card>
        <Card.Body>
          {loading ? (
            <div className="text-center p-5">
              <Spinner animation="border" role="status">
                <span className="visually-hidden">読み込み中...</span>
              </Spinner>
              <p className="mt-2">ETC記録を読み込んでいます...</p>
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
          ) : records.length === 0 ? (
            <div className="text-center p-4">
              <p className="text-muted">
                条件に一致するETC記録がありません。
              </p>
            </div>
          ) : (
            <>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0">
                  ETC利用記録 ({pagination.total}件中 {((pagination.page - 1) * pagination.per_page) + 1}-{Math.min(pagination.page * pagination.per_page, pagination.total)}件表示)
                </h5>
                <Form.Select
                  style={{ width: 'auto' }}
                  value={filters.per_page}
                  onChange={(e) => handleFilterChange('per_page', parseInt(e.target.value))}
                >
                  <option value={10}>10件表示</option>
                  <option value={20}>20件表示</option>
                  <option value={50}>50件表示</option>
                  <option value={100}>100件表示</option>
                </Form.Select>
              </div>

              <Table striped bordered hover responsive>
                <thead>
                  <tr>
                    <th>利用日時</th>
                    <th>車両番号</th>
                    <th>区間</th>
                    <th>料金情報</th>
                    <th>ETCカード</th>
                    <th>備考</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.id}>
                      <td>
                        {formatUsageDateTime(record)}
                      </td>
                      <td>
                        <div>
                          <strong>{record.vehicle_number}</strong>
                        </div>
                      </td>
                      <td>
                        {formatICDisplay(record)}
                      </td>
                      <td>
                        <div>
                          <span className="text-decoration-line-through text-muted">
                            {formatCurrency(record.original_fee)}
                          </span>
                        </div>
                        <div>
                          <strong className="text-success">
                            {formatCurrency(record.final_fee)}
                          </strong>
                          {record.discount > 0 && (
                            <small className="text-success ms-1">
                              (-{formatCurrency(record.discount)})
                            </small>
                          )}
                        </div>
                      </td>
                      <td>
                        <small className="font-monospace">
                          {record.etc_card_number}
                        </small>
                      </td>
                      <td>
                        <small>{record.notes || '-'}</small>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>

              {/* ページネーション */}
              {pagination.pages > 1 && (
                <div className="d-flex justify-content-center mt-4">
                  <Pagination>
                    <Pagination.First 
                      disabled={!pagination.has_prev}
                      onClick={() => handlePageChange(1)}
                    />
                    <Pagination.Prev 
                      disabled={!pagination.has_prev}
                      onClick={() => handlePageChange(pagination.page - 1)}
                    />
                    
                    {/* ページ番号表示 */}
                    {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                      const start = Math.max(1, pagination.page - 2);
                      const pageNum = start + i;
                      
                      if (pageNum <= pagination.pages) {
                        return (
                          <Pagination.Item
                            key={pageNum}
                            active={pageNum === pagination.page}
                            onClick={() => handlePageChange(pageNum)}
                          >
                            {pageNum}
                          </Pagination.Item>
                        );
                      }
                      return null;
                    })}
                    
                    <Pagination.Next 
                      disabled={!pagination.has_next}
                      onClick={() => handlePageChange(pagination.page + 1)}
                    />
                    <Pagination.Last 
                      disabled={!pagination.has_next}
                      onClick={() => handlePageChange(pagination.pages)}
                    />
                  </Pagination>
                </div>
              )}
            </>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
}