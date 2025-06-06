// src/app/maintenance/schedule/page.js - 改良版
'use client';

import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Tabs, Tab, Form, Button, Alert, Spinner, Modal, ButtonGroup } from 'react-bootstrap';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/ja';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import Link from 'next/link';

// API基本URLを定義
const API_BASE_URL = 'http://127.0.0.1:5000/api';

moment.locale('ja');
const localizer = momentLocalizer(moment);

export default function EnhancedMaintenanceSchedulePage() {
  const [vehicles, setVehicles] = useState([]);
  const [maintenanceTypes, setMaintenanceTypes] = useState([]);
  const [maintenanceStatuses, setMaintenanceStatuses] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('calendar');
  
  // フィルター状態
  const [filterType, setFilterType] = useState('all');
  const [filterVehicle, setFilterVehicle] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [dateRange, setDateRange] = useState({
    start: moment().subtract(1, 'month').toDate(),
    end: moment().add(6, 'month').toDate()
  });
  
  // 一括操作用モーダル
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkOperation, setBulkOperation] = useState('');
  const [selectedSchedules, setSelectedSchedules] = useState([]);
  
  // 概要データ
  const [summary, setSummary] = useState({
    counts: { 
      tentative: 0,
      scheduled_this_month: 0, 
      completed_this_month: 0, 
      overdue: 0 
    }
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
        await refreshSchedules();
        
        setError(null);
      } catch (err) {
        console.error('データの取得に失敗しました:', err);
        setError(`データの取得に失敗しました。${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);
  
  // スケジュールの再読み込み
  const refreshSchedules = async () => {
    try {
      const start = moment(dateRange.start).format('YYYY-MM-DD');
      const end = moment(dateRange.end).format('YYYY-MM-DD');
      
      let url = `${API_BASE_URL}/maintenance/schedules/?start_date=${start}&end_date=${end}`;
      
      if (filterVehicle !== 'all') {
        url += `&vehicle_id=${filterVehicle}`;
      }
      
      if (filterType !== 'all') {
        const typeId = maintenanceTypes.find(t => t.name === filterType)?.id;
        if (typeId) {
          url += `&maintenance_type_id=${typeId}`;
        }
      }
      
      if (filterStatus !== 'all') {
        const statusId = maintenanceStatuses.find(s => s.name === filterStatus)?.id;
        if (statusId) {
          url += `&status_id=${statusId}`;
        }
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`点検予定取得エラー: ${response.status}`);
      }
      
      const data = await response.json();
      
      // カレンダー用データに変換
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
        technician: schedule.technician,
        rawData: schedule
      }));
      
      setSchedules(calendarEvents);
    } catch (err) {
      console.error('点検予定取得エラー:', err);
      setError(`点検予定取得エラー: ${err.message}`);
    }
  };
  
  // フィルター変更時のハンドラ
  useEffect(() => {
    if (!loading && maintenanceTypes.length > 0 && maintenanceStatuses.length > 0) {
      refreshSchedules();
    }
  }, [filterType, filterVehicle, filterStatus, dateRange]);
  
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
      await refreshSchedules();
    } catch (err) {
      console.error('点検予定生成エラー:', err);
      setError(`点検予定生成エラー: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // 一括操作の実行
  const executeBulkOperation = async () => {
    if (selectedSchedules.length === 0) {
      alert('操作する予定を選択してください');
      return;
    }
    
    try {
      setLoading(true);
      
      const operations = selectedSchedules.map(async (scheduleId) => {
        let url = `${API_BASE_URL}/maintenance/schedules/${scheduleId}/`;
        let method = 'PUT';
        let body = {};
        
        switch (bulkOperation) {
          case 'confirm':
            // 仮予定を確定予定に変更
            const scheduledStatus = maintenanceStatuses.find(s => s.name === '予定');
            body = { status_id: scheduledStatus.id };
            break;
          case 'complete':
            // 一括完了処理
            url = `${API_BASE_URL}/maintenance/schedules/${scheduleId}/complete/`;
            method = 'POST';
            body = { 
              completion_date: moment().format('YYYY-MM-DD'),
              notes: '一括完了処理'
            };
            break;
          case 'postpone':
            // 1週間延期
            const schedule = schedules.find(s => s.id === scheduleId);
            if (schedule) {
              body = { 
                scheduled_date: moment(schedule.start).add(1, 'week').format('YYYY-MM-DD')
              };
            }
            break;
        }
        
        return fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
      });
      
      await Promise.all(operations);
      
      alert(`${selectedSchedules.length}件の操作が完了しました`);
      setSelectedSchedules([]);
      setShowBulkModal(false);
      await refreshSchedules();
    } catch (err) {
      console.error('一括操作エラー:', err);
      alert(`一括操作中にエラーが発生しました: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // 選択チェックボックスの変更
  const handleScheduleSelection = (scheduleId, checked) => {
    if (checked) {
      setSelectedSchedules([...selectedSchedules, scheduleId]);
    } else {
      setSelectedSchedules(selectedSchedules.filter(id => id !== scheduleId));
    }
  };
  
  // 状態に基づくバッジの色を設定
  const getStatusBadge = (status) => {
    const statusObj = maintenanceStatuses.find(s => s.name === status);
    let variant = 'secondary';
    
    switch (status) {
      case '仮予定': variant = 'secondary'; break;
      case '予定': variant = 'primary'; break;
      case '完了': variant = 'success'; break;
      case '未実施': variant = 'danger'; break;
      case '延期': variant = 'warning'; break;
      default: variant = 'secondary';
    }
    
    return <Badge bg={variant}>{status || '不明'}</Badge>;
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
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>車検・点検予定管理</h1>
        <div className="d-flex gap-2">
          <Button variant="success" onClick={generateSchedules}>
            点検予定自動生成
          </Button>
          <Button 
            variant="warning" 
            onClick={() => setShowBulkModal(true)}
            disabled={selectedSchedules.length === 0}
          >
            一括操作 ({selectedSchedules.length})
          </Button>
          <Link href="/maintenance/schedule/new">
            <Button variant="primary">新規点検登録</Button>
          </Link>
        </div>
      </div>
      
      {/* 概要カード */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="border-secondary">
            <Card.Body>
              <div className="d-flex justify-content-between">
                <div>
                  <Card.Title className="text-muted small">仮予定</Card.Title>
                  <Card.Text className="h4 mb-0">{summary.counts.tentative}</Card.Text>
                </div>
                <div className="text-secondary fs-3">📋</div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-primary">
            <Card.Body>
              <div className="d-flex justify-content-between">
                <div>
                  <Card.Title className="text-muted small">今月の予定</Card.Title>
                  <Card.Text className="h4 mb-0">{summary.counts.scheduled_this_month}</Card.Text>
                </div>
                <div className="text-primary fs-3">📅</div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-success">
            <Card.Body>
              <div className="d-flex justify-content-between">
                <div>
                  <Card.Title className="text-muted small">今月完了</Card.Title>
                  <Card.Text className="h4 mb-0">{summary.counts.completed_this_month}</Card.Text>
                </div>
                <div className="text-success fs-3">✅</div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-danger">
            <Card.Body>
              <div className="d-flex justify-content-between">
                <div>
                  <Card.Title className="text-muted small">未実施</Card.Title>
                  <Card.Text className="h4 mb-0">{summary.counts.overdue}</Card.Text>
                </div>
                <div className="text-danger fs-3">⚠️</div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
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
                    onChange={(e) => setDateRange({
                      ...dateRange,
                      start: new Date(e.target.value)
                    })}
                  />
                  <span className="mx-2 d-flex align-items-center">〜</span>
                  <Form.Control
                    type="date"
                    value={moment(dateRange.end).format('YYYY-MM-DD')}
                    onChange={(e) => setDateRange({
                      ...dateRange,
                      end: new Date(e.target.value)
                    })}
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
            <ButtonGroup>
              <Button 
                variant={viewMode === 'calendar' ? 'primary' : 'outline-primary'} 
                onClick={() => setViewMode('calendar')}
              >
                📅 カレンダー表示
              </Button>
              <Button 
                variant={viewMode === 'list' ? 'primary' : 'outline-primary'}
                onClick={() => setViewMode('list')}
              >
                📋 リスト表示
              </Button>
              <Button 
                variant={viewMode === 'workflow' ? 'primary' : 'outline-primary'}
                onClick={() => setViewMode('workflow')}
              >
                🔄 ワークフロー表示
              </Button>
            </ButtonGroup>
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
                eventPropGetter={(event) => ({
                  style: {
                    backgroundColor: event.backgroundColor || '#007bff',
                    borderRadius: '5px',
                    color: 'white',
                    border: 'none',
                    display: 'block'
                  }
                })}
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
      ) : viewMode === 'list' ? (
        // リスト表示（選択機能付き）
        <Card>
          <Card.Header>
            <div className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">点検予定一覧</h5>
              <Form.Check
                type="checkbox"
                label="全選択"
                checked={selectedSchedules.length === schedules.length && schedules.length > 0}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedSchedules(schedules.map(s => s.id));
                  } else {
                    setSelectedSchedules([]);
                  }
                }}
              />
            </div>
          </Card.Header>
          <Card.Body>
            {schedules.length === 0 ? (
              <Alert variant="info">条件に一致する点検予定/実績がありません</Alert>
            ) : (
              <Table striped bordered hover responsive>
                <thead>
                  <tr>
                    <th style={{width: '50px'}}>選択</th>
                    <th>日付</th>
                    <th>車両</th>
                    <th>点検種類</th>
                    <th>状態</th>
                    <th>担当者</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {[...schedules]
                    .sort((a, b) => new Date(a.start) - new Date(b.start))
                    .map(schedule => {
                      const vehicle = vehicles.find(v => v.id === schedule.vehicle_id);
                      
                      return (
                        <tr key={schedule.id}>
                          <td>
                            <Form.Check
                              type="checkbox"
                              checked={selectedSchedules.includes(schedule.id)}
                              onChange={(e) => handleScheduleSelection(schedule.id, e.target.checked)}
                            />
                          </td>
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
                              {schedule.status === '仮予定' && (
                                <Button 
                                  size="sm" 
                                  variant="primary"
                                  onClick={() => confirmSchedule(schedule.id)}
                                >
                                  確定
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  }
                </tbody>
              </Table>
            )}
          </Card.Body>
        </Card>
      ) : (
        // ワークフロー表示
        <Row>
          <Col md={3}>
            <Card className="border-secondary mb-4">
              <Card.Header className="bg-secondary text-white">
                <h6 className="mb-0">🟦 仮予定 ({schedules.filter(s => s.status === '仮予定').length})</h6>
              </Card.Header>
              <Card.Body style={{ maxHeight: '600px', overflowY: 'auto' }}>
                {schedules
                  .filter(s => s.status === '仮予定')
                  .sort((a, b) => new Date(a.start) - new Date(b.start))
                  .map(schedule => (
                    <Card key={schedule.id} className="mb-2 border-secondary">
                      <Card.Body className="p-2">
                        <div className="small">
                          <strong>{moment(schedule.start).format('MM/DD')}</strong>
                          <br />
                          {schedule.title.split(' (')[0]}
                          <br />
                          <span className="text-muted">
                            {vehicles.find(v => v.id === schedule.vehicle_id)?.plate || 'ID:' + schedule.vehicle_id}
                          </span>
                        </div>
                        <div className="mt-2">
                          <Button 
                            size="sm" 
                            variant="primary" 
                            className="me-1"
                            onClick={() => confirmSchedule(schedule.id)}
                          >
                            確定
                          </Button>
                          <Link href={`/maintenance/schedule/${schedule.id}`}>
                            <Button size="sm" variant="outline-info">詳細</Button>
                          </Link>
                        </div>
                      </Card.Body>
                    </Card>
                  ))
                }
              </Card.Body>
            </Card>
          </Col>
          
          <Col md={3}>
            <Card className="border-primary mb-4">
              <Card.Header className="bg-primary text-white">
                <h6 className="mb-0">📅 確定予定 ({schedules.filter(s => s.status === '予定').length})</h6>
              </Card.Header>
              <Card.Body style={{ maxHeight: '600px', overflowY: 'auto' }}>
                {schedules
                  .filter(s => s.status === '予定')
                  .sort((a, b) => new Date(a.start) - new Date(b.start))
                  .map(schedule => (
                    <Card key={schedule.id} className="mb-2 border-primary">
                      <Card.Body className="p-2">
                        <div className="small">
                          <strong>{moment(schedule.start).format('MM/DD')}</strong>
                          <br />
                          {schedule.title.split(' (')[0]}
                          <br />
                          <span className="text-muted">
                            {vehicles.find(v => v.id === schedule.vehicle_id)?.plate || 'ID:' + schedule.vehicle_id}
                          </span>
                          {schedule.technician && (
                            <>
                              <br />
                              <span className="text-primary">担当: {schedule.technician}</span>
                            </>
                          )}
                        </div>
                        <div className="mt-2">
                          <Button 
                            size="sm" 
                            variant="success" 
                            className="me-1"
                            onClick={() => completeSchedule(schedule.id)}
                          >
                            完了
                          </Button>
                          <Link href={`/maintenance/schedule/${schedule.id}/edit`}>
                            <Button size="sm" variant="outline-warning">編集</Button>
                          </Link>
                        </div>
                      </Card.Body>
                    </Card>
                  ))
                }
              </Card.Body>
            </Card>
          </Col>
          
          <Col md={3}>
            <Card className="border-success mb-4">
              <Card.Header className="bg-success text-white">
                <h6 className="mb-0">✅ 完了 ({schedules.filter(s => s.status === '完了').length})</h6>
              </Card.Header>
              <Card.Body style={{ maxHeight: '600px', overflowY: 'auto' }}>
                {schedules
                  .filter(s => s.status === '完了')
                  .sort((a, b) => new Date(b.start) - new Date(a.start))
                  .slice(0, 10)
                  .map(schedule => (
                    <Card key={schedule.id} className="mb-2 border-success">
                      <Card.Body className="p-2">
                        <div className="small">
                          <strong>{moment(schedule.start).format('MM/DD')}</strong>
                          <br />
                          {schedule.title.split(' (')[0]}
                          <br />
                          <span className="text-muted">
                            {vehicles.find(v => v.id === schedule.vehicle_id)?.plate || 'ID:' + schedule.vehicle_id}
                          </span>
                          {schedule.rawData?.completion_date && (
                            <>
                              <br />
                              <span className="text-success">
                                完了: {moment(schedule.rawData.completion_date).format('MM/DD')}
                              </span>
                            </>
                          )}
                        </div>
                        <div className="mt-2">
                          <Link href={`/maintenance/schedule/${schedule.id}`}>
                            <Button size="sm" variant="outline-info">詳細</Button>
                          </Link>
                        </div>
                      </Card.Body>
                    </Card>
                  ))
                }
              </Card.Body>
            </Card>
          </Col>
          
          <Col md={3}>
            <Card className="border-danger mb-4">
              <Card.Header className="bg-danger text-white">
                <h6 className="mb-0">⚠️ 未実施・延期 ({schedules.filter(s => ['未実施', '延期'].includes(s.status)).length})</h6>
              </Card.Header>
              <Card.Body style={{ maxHeight: '600px', overflowY: 'auto' }}>
                {schedules
                  .filter(s => ['未実施', '延期'].includes(s.status))
                  .sort((a, b) => new Date(a.start) - new Date(b.start))
                  .map(schedule => (
                    <Card key={schedule.id} className="mb-2 border-danger">
                      <Card.Body className="p-2">
                        <div className="small">
                          <strong className="text-danger">{moment(schedule.start).format('MM/DD')}</strong>
                          <br />
                          {schedule.title.split(' (')[0]}
                          <br />
                          <span className="text-muted">
                            {vehicles.find(v => v.id === schedule.vehicle_id)?.plate || 'ID:' + schedule.vehicle_id}
                          </span>
                          <br />
                          <span className="text-danger">
                            {moment().diff(moment(schedule.start), 'days')}日経過
                          </span>
                        </div>
                        <div className="mt-2">
                          <Button 
                            size="sm" 
                            variant="success" 
                            className="me-1"
                            onClick={() => completeSchedule(schedule.id)}
                          >
                            完了
                          </Button>
                          <Link href={`/maintenance/schedule/${schedule.id}/edit`}>
                            <Button size="sm" variant="outline-warning">編集</Button>
                          </Link>
                        </div>
                      </Card.Body>
                    </Card>
                  ))
                }
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
      
      {/* 一括操作モーダル */}
      <Modal show={showBulkModal} onHide={() => setShowBulkModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>一括操作</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>{selectedSchedules.length}件の予定が選択されています。</p>
          <Form.Group>
            <Form.Label>操作を選択</Form.Label>
            <Form.Select value={bulkOperation} onChange={(e) => setBulkOperation(e.target.value)}>
              <option value="">操作を選択してください</option>
              <option value="confirm">仮予定を確定予定に変更</option>
              <option value="complete">一括完了処理</option>
              <option value="postpone">1週間延期</option>
            </Form.Select>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowBulkModal(false)}>
            キャンセル
          </Button>
          <Button 
            variant="primary" 
            onClick={executeBulkOperation}
            disabled={!bulkOperation}
          >
            実行
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
  
  // 個別の予定確定
  const confirmSchedule = async (scheduleId) => {
    try {
      const scheduledStatus = maintenanceStatuses.find(s => s.name === '予定');
      
      const response = await fetch(`${API_BASE_URL}/maintenance/schedules/${scheduleId}/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status_id: scheduledStatus.id })
      });
      
      if (!response.ok) {
        throw new Error('予定確定エラー');
      }
      
      await refreshSchedules();
    } catch (err) {
      alert(`予定確定エラー: ${err.message}`);
    }
  };
  
  // 個別の完了処理
  const completeSchedule = async (scheduleId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/maintenance/schedules/${scheduleId}/complete/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          completion_date: moment().format('YYYY-MM-DD'),
          notes: 'クイック完了処理'
        })
      });
      
      if (!response.ok) {
        throw new Error('完了処理エラー');
      }
      
      await refreshSchedules();
    } catch (err) {
      alert(`完了処理エラー: ${err.message}`);
    }
  };
}