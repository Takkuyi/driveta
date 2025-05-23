// src/app/maintenance/schedule/page.js
'use client';

import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Tabs, Tab, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/ja';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import Link from 'next/link';

// API基本URLを定義
const API_BASE_URL = 'http://127.0.0.1:5000/api';

// モーメントのローカライザを設定（日本語対応）
moment.locale('ja');
const localizer = momentLocalizer(moment);

export default function MaintenanceSchedulePage() {
  const [vehicles, setVehicles] = useState([]);
  const [maintenanceTypes, setMaintenanceTypes] = useState([]);
  const [maintenanceStatuses, setMaintenanceStatuses] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' or 'list'
  const [filterType, setFilterType] = useState('all'); // 'all', 'inspection', '3month'
  const [filterVehicle, setFilterVehicle] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'scheduled', 'completed', 'overdue'
  const [dateRange, setDateRange] = useState({
    start: moment().subtract(1, 'month').toDate(),
    end: moment().add(6, 'month').toDate()
  });
  const [summary, setSummary] = useState({
    counts: { scheduled_this_month: 0, completed_this_month: 0, overdue: 0 }
  });

  // データ取得
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // 車両一覧を取得
        const vehiclesResponse = await fetch(`${API_BASE_URL}/vehicles/`);
        if (!vehiclesResponse.ok) {
          throw new Error(`車両データ取得エラー: ${vehiclesResponse.status}`);
        }
        const vehiclesData = await vehiclesResponse.json();
        setVehicles(vehiclesData);
        
        // 点検種類一覧を取得
        const typesResponse = await fetch(`${API_BASE_URL}/maintenance/types/`);
        if (typesResponse.ok) {
          const typesData = await typesResponse.json();
          setMaintenanceTypes(typesData);
        }
        
        // 整備状態一覧を取得
        const statusesResponse = await fetch(`${API_BASE_URL}/maintenance/statuses/`);
        if (statusesResponse.ok) {
          const statusesData = await statusesResponse.json();
          setMaintenanceStatuses(statusesData);
        }
        
        // 点検概要を取得
        const summaryResponse = await fetch(`${API_BASE_URL}/maintenance/summary/`);
        if (summaryResponse.ok) {
          const summaryData = await summaryResponse.json();
          setSummary(summaryData);
        }
        
        // カレンダーデータを取得
        const start = moment(dateRange.start).format('YYYY-MM-DD');
        const end = moment(dateRange.end).format('YYYY-MM-DD');
        
        const calendarResponse = await fetch(
          `${API_BASE_URL}/maintenance/calendar/?start_date=${start}&end_date=${end}`
        );
        
        if (!calendarResponse.ok) {
          throw new Error(`カレンダーデータ取得エラー: ${calendarResponse.status}`);
        }
        
        const calendarData = await calendarResponse.json();
        setSchedules(calendarData);
        setError(null);
      } catch (err) {
        console.error('データの取得に失敗しました:', err);
        setError(`データの取得に失敗しました。${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dateRange]);
  
  // データの再読み込み
  const refreshData = () => {
    const start = moment(dateRange.start).format('YYYY-MM-DD');
    const end = moment(dateRange.end).format('YYYY-MM-DD');
    
    // 検索条件を組み立て
    let url = `${API_BASE_URL}/maintenance/schedules/?start_date=${start}&end_date=${end}`;
    
    if (filterVehicle !== 'all') {
      url += `&vehicle_id=${filterVehicle}`;
    }
    
    if (filterType !== 'all') {
      // 点検種類IDを検索
      const typeId = maintenanceTypes.find(t => t.name === filterType)?.id;
      if (typeId) {
        url += `&maintenance_type_id=${typeId}`;
      }
    }
    
    if (filterStatus !== 'all') {
      // 状態IDを検索
      const statusId = maintenanceStatuses.find(s => s.name === filterStatus)?.id;
      if (statusId) {
        url += `&status_id=${statusId}`;
      }
    }
    
    fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error(`点検予定取得エラー: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        // スケジュールをカレンダー形式に変換
        const calendarEvents = data.map(schedule => ({
          id: schedule.id,
          title: `${schedule.maintenance_type.name} (${schedule.vehicle_info.plate || 'ID:' + schedule.vehicle_id})`,
          start: new Date(schedule.scheduled_date),
          end: new Date(schedule.scheduled_date),
          allDay: true,
          status: schedule.status.name,
          backgroundColor: schedule.status.color_code,
          borderColor: schedule.status.color_code,
          vehicle_id: schedule.vehicle_id,
          maintenance_type_id: schedule.maintenance_type.id,
          technician: schedule.technician
        }));
        
        setSchedules(calendarEvents);
      })
      .catch(err => {
        console.error('点検予定取得エラー:', err);
        setError(`点検予定取得エラー: ${err.message}`);
      });
  };
  
  // フィルター変更時のハンドラ
  useEffect(() => {
    if (!loading) {
      refreshData();
    }
  }, [filterType, filterVehicle, filterStatus]);
  
  // 日付範囲変更時のハンドラ
  const handleDateRangeChange = (start, end) => {
    setDateRange({ start, end });
  };
  
  // カレンダーイベントのスタイルをステータスに基づいて設定
  const eventStyleGetter = (event) => {
    return {
      style: {
        backgroundColor: event.backgroundColor || '#007bff',
        borderRadius: '5px',
        color: 'white',
        border: 'none',
        display: 'block'
      }
    };
  };
  
  // 状態に基づくバッジの色を設定
  const getStatusBadge = (status) => {
    const statusObj = maintenanceStatuses.find(s => s.name === status);
    const bgColor = statusObj?.color_code || '#6c757d';
    
    return <Badge bg={getBadgeVariant(bgColor)}>{status || '不明'}</Badge>;
  };
  
  // 色コードからBootstrapのバリアントを取得
  const getBadgeVariant = (colorCode) => {
    const colorMap = {
      '#28a745': 'success',
      '#dc3545': 'danger',
      '#ffc107': 'warning',
      '#17a2b8': 'info',
      '#007bff': 'primary',
      '#6c757d': 'secondary'
    };
    
    return colorMap[colorCode] || 'secondary';
  };
  
  // 点検予定自動生成
  const generateSchedules = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`${API_BASE_URL}/maintenance/generate-schedules/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          start_date: moment().format('YYYY-MM-DD'),
          end_date: moment().add(1, 'year').format('YYYY-MM-DD')
        })
      });
      
      if (!response.ok) {
        throw new Error(`点検予定生成エラー: ${response.status}`);
      }
      
      const result = await response.json();
      alert(`${result.count}件の点検予定を生成しました`);
      
      // データを再読み込み
      refreshData();
    } catch (err) {
      console.error('点検予定生成エラー:', err);
      setError(`点検予定生成エラー: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="text-center p-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">読み込み中...</span>
        </Spinner>
        <p className="mt-2">車検・点検データを読み込んでいます...</p>
      </div>
    );
  }
  
  if (error) {
    return (
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
    );
  }

  return (
    <Container fluid>
      <h1 className="mb-4">車検・点検予定/実績</h1>
      
      {/* フィルターと表示切替 */}
      <Card className="mb-4">
        <Card.Body>
          <Row className="mb-3">
            <Col md={3}>
              <Form.Group>
                <Form.Label>表示期間</Form.Label>
                <div className="d-flex">
                  <Form.Control
                    type="date"
                    value={moment(dateRange.start).format('YYYY-MM-DD')}
                    onChange={(e) => handleDateRangeChange(new Date(e.target.value), dateRange.end)}
                  />
                  <span className="mx-2 d-flex align-items-center">〜</span>
                  <Form.Control
                    type="date"
                    value={moment(dateRange.end).format('YYYY-MM-DD')}
                    onChange={(e) => handleDateRangeChange(dateRange.start, new Date(e.target.value))}
                  />
                </div>
              </Form.Group>
            </Col>
            
            <Col md={3}>
              <Form.Group>
                <Form.Label>点検種類</Form.Label>
                <Form.Select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                  <option value="all">すべて</option>
                  {maintenanceTypes.map(type => (
                    <option key={type.id} value={type.name}>
                      {type.name}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            
            <Col md={3}>
              <Form.Group>
                <Form.Label>車両</Form.Label>
                <Form.Select value={filterVehicle} onChange={(e) => setFilterVehicle(e.target.value)}>
                  <option value="all">すべての車両</option>
                  {vehicles.map(vehicle => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.plate || 'ID:' + vehicle.id} - {vehicle.number || '番号なし'}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            
            <Col md={3}>
              <Form.Group>
                <Form.Label>状態</Form.Label>
                <Form.Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                  <option value="all">すべての状態</option>
                  {maintenanceStatuses.map(status => (
                    <option key={status.id} value={status.name}>
                      {status.name}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
          
          <div className="d-flex justify-content-between">
            <div className="btn-group" role="group">
              <Button 
                variant={viewMode === 'calendar' ? 'primary' : 'outline-primary'} 
                onClick={() => setViewMode('calendar')}
              >
                カレンダー表示
              </Button>
              <Button 
                variant={viewMode === 'list' ? 'primary' : 'outline-primary'}
                onClick={() => setViewMode('list')}
              >
                リスト表示
              </Button>
            </div>
            
            <div>
              <Button variant="outline-success" onClick={generateSchedules} className="me-2">
                点検予定生成
              </Button>
              <Link href="/maintenance/schedule/new">
                <Button variant="primary">
                  新規点検予定登録
                </Button>
              </Link>
            </div>
          </div>
        </Card.Body>
      </Card>
      
      {viewMode === 'calendar' ? (
        // カレンダー表示
        <Card>
          <Card.Body>
            <div style={{ height: 700 }}>
              <Calendar
                localizer={localizer}
                events={schedules}
                startAccessor="start"
                endAccessor="end"
                titleAccessor="title"
                style={{ height: '100%' }}
                views={['month', 'week', 'agenda']}
                defaultView="month"
                defaultDate={new Date()}
                eventPropGetter={eventStyleGetter}
                messages={{
                  week: '週',
                  work_week: '稼働週',
                  day: '日',
                  month: '月',
                  previous: '前へ',
                  next: '次へ',
                  today: '今日',
                  agenda: '予定一覧',
                }}
                formats={{
                  monthHeaderFormat: 'YYYY年MM月',
                  agendaHeaderFormat: ({ start, end }) => 
                    `${moment(start).format('YYYY年MM月DD日')} - ${moment(end).format('YYYY年MM月DD日')}`,
                  dayRangeHeaderFormat: ({ start, end }) => 
                    `${moment(start).format('YYYY年MM月DD日')} - ${moment(end).format('YYYY年MM月DD日')}`,
                }}
                onNavigate={(date) => {
                  const newStart = moment(date).subtract(1, 'month').toDate();
                  const newEnd = moment(date).add(2, 'month').toDate();
                  setDateRange({ start: newStart, end: newEnd });
                }}
                onSelectEvent={(event) => {
                  window.location.href = `/maintenance/schedule/${event.id}`;
                }}
              />
            </div>
          </Card.Body>
        </Card>
      ) : (
        // リスト表示
        <Card>
          <Card.Body>
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>日付</th>
                  <th>車両</th>
                  <th>点検種類</th>
                  <th>状態</th>
                  <th>担当者</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {schedules.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center">
                      条件に一致する点検予定/実績がありません
                    </td>
                  </tr>
                ) : (
                  // スケジュールを日付順にソート
                  [...schedules]
                    .sort((a, b) => new Date(a.start) - new Date(b.start))
                    .map(schedule => {
                      // 車両情報を取得
                      const vehicle = vehicles.find(v => v.id === schedule.vehicle_id);
                      
                      return (
                        <tr key={schedule.id}>
                          <td>{moment(schedule.start).format('YYYY/MM/DD')}</td>
                          <td>
                            <Link href={`/vehicles/${schedule.vehicle_id}`}>
                              {vehicle?.plate || `ID:${schedule.vehicle_id}`}
                            </Link>
                          </td>
                          <td>{schedule.title.split(' (')[0]}</td>
                          <td>{getStatusBadge(schedule.status)}</td>
                          <td>{schedule.technician || '-'}</td>
                          <td>
                            <div className="d-flex gap-1">
                              <Link href={`/maintenance/schedule/${schedule.id}`}>
                                <Button size="sm" variant="info">詳細</Button>
                              </Link>
                              <Link href={`/maintenance/schedule/${schedule.id}/edit`}>
                                <Button size="sm" variant="warning">編集</Button>
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}
      
      {/* 概要情報 */}
      <Row className="mt-4">
        <Col md={4}>
          <Card>
            <Card.Header className="bg-primary text-white">
              <h5 className="mb-0">今月の点検予定</h5>
            </Card.Header>
            <Card.Body>
              <p className="h3 text-center">
                {summary.counts.scheduled_this_month}件
              </p>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={4}>
          <Card>
            <Card.Header className="bg-success text-white">
              <h5 className="mb-0">今月の点検完了</h5>
            </Card.Header>
            <Card.Body>
              <p className="h3 text-center">
                {summary.counts.completed_this_month}件
              </p>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={4}>
          <Card>
            <Card.Header className="bg-danger text-white">
              <h5 className="mb-0">未実施の点検</h5>
            </Card.Header>
            <Card.Body>
              <p className="h3 text-center">
                {summary.counts.overdue}件
              </p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      {/* 直近の点検予定 */}
      <Row className="mt-4">
        <Col md={6}>
          <Card>
            <Card.Header className="bg-info text-white">
              <h5 className="mb-0">直近の点検予定</h5>
            </Card.Header>
            <Card.Body>
              {summary.upcoming_schedules && summary.upcoming_schedules.length > 0 ? (
                <Table striped bordered>
                  <thead>
                    <tr>
                      <th>日付</th>
                      <th>車両</th>
                      <th>点検種類</th>
                      <th>残り日数</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.upcoming_schedules.map((schedule) => (
                      <tr key={schedule.id}>
                        <td>{moment(schedule.scheduled_date).format('YYYY/MM/DD')}</td>
                        <td>
                          <Link href={`/vehicles/${schedule.vehicle_id}`}>
                            {schedule.vehicle_plate || `ID:${schedule.vehicle_id}`}
                          </Link>
                        </td>
                        <td>{schedule.maintenance_type}</td>
                        <td>{schedule.days_until}日</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <p className="text-center my-3">直近の点検予定はありません</p>
              )}
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={6}>
          <Card>
            <Card.Header className="bg-warning text-white">
              <h5 className="mb-0">未実施の点検</h5>
            </Card.Header>
            <Card.Body>
              {summary.overdue_schedules && summary.overdue_schedules.length > 0 ? (
                <Table striped bordered>
                  <thead>
                    <tr>
                      <th>日付</th>
                      <th>車両</th>
                      <th>点検種類</th>
                      <th>経過日数</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.overdue_schedules.map((schedule) => (
                      <tr key={schedule.id}>
                        <td>{moment(schedule.scheduled_date).format('YYYY/MM/DD')}</td>
                        <td>
                          <Link href={`/vehicles/${schedule.vehicle_id}`}>
                            {schedule.vehicle_plate || `ID:${schedule.vehicle_id}`}
                          </Link>
                        </td>
                        <td>{schedule.maintenance_type}</td>
                        <td className="text-danger">{schedule.days_overdue}日超過</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <p className="text-center my-3">未実施の点検はありません</p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}