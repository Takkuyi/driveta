// frontend/src/app/driving-log/page.js
'use client';

import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Form, Modal, Alert, Badge, Spinner } from 'react-bootstrap';
import Link from 'next/link';
import moment from 'moment';
import 'moment/locale/ja';

const API_BASE_URL = 'http://127.0.0.1:5000/api';

moment.locale('ja');

export default function DrivingLogPage() {
  const [logs, setLogs] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // フィルター状態
  const [filters, setFilters] = useState({
    start_date: moment().subtract(30, 'days').format('YYYY-MM-DD'),
    end_date: moment().format('YYYY-MM-DD'),
    driver_id: '',
    vehicle_id: ''
  });

  // モーダル状態
  const [showModal, setShowModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [currentLog, setCurrentLog] = useState(null);

  // フォーム状態
  const [formData, setFormData] = useState({
    date: moment().format('YYYY-MM-DD'),
    driver_id: '',
    vehicle_id: '',
    start_time: '08:00',
    end_time: '17:00',
    start_mileage: '',
    end_mileage: '',
    destination_id: '',
    destination_name: '',
    is_trainee: false,
    notes: ''
  });

  const [formValidated, setFormValidated] = useState(false);

  // データ取得
  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // 運転日報取得
      const logsParams = new URLSearchParams(filters);
      const logsResponse = await fetch(`${API_BASE_URL}/driving-log/logs/?${logsParams}`, {
        credentials: 'include'
      });
      
      if (!logsResponse.ok) throw new Error('運転日報取得エラー');
      const logsData = await logsResponse.json();
      setLogs(logsData);

      // ドライバー一覧取得
      const driversResponse = await fetch(`${API_BASE_URL}/employee/?is_driver=true&is_active=true`, {
        credentials: 'include'
      });
      if (driversResponse.ok) {
        const driversData = await driversResponse.json();
        setDrivers(driversData);
      }

      // 車両一覧取得
      const vehiclesResponse = await fetch(`${API_BASE_URL}/vehicles/`, {
        credentials: 'include'
      });
      if (vehiclesResponse.ok) {
        const vehiclesData = await vehiclesResponse.json();
        setVehicles(vehiclesData.filter(v => v.status === '運行中'));
      }

      // 配送先一覧取得
      const destinationsResponse = await fetch(`${API_BASE_URL}/driving-log/destinations/`, {
        credentials: 'include'
      });
      if (destinationsResponse.ok) {
        const destinationsData = await destinationsResponse.json();
        setDestinations(destinationsData);
      }

      setError(null);
    } catch (err) {
      console.error('データ取得エラー:', err);
      setError(`データの取得に失敗しました: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // フィルター変更
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // フォーム送信
  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;

    if (form.checkValidity() === false) {
      e.stopPropagation();
      setFormValidated(true);
      return;
    }

    try {
      const url = isEdit 
        ? `${API_BASE_URL}/driving-log/logs/${currentLog.id}/`
        : `${API_BASE_URL}/driving-log/logs/`;
      
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          driver_id: parseInt(formData.driver_id),
          vehicle_id: parseInt(formData.vehicle_id),
          destination_id: formData.destination_id ? parseInt(formData.destination_id) : null,
          start_mileage: parseInt(formData.start_mileage),
          end_mileage: parseInt(formData.end_mileage)
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '登録エラー');
      }

      // 成功
      setShowModal(false);
      resetForm();
      fetchData();
      
    } catch (err) {
      setError(err.message);
    }
  };

  // フォームリセット
  const resetForm = () => {
    setFormData({
      date: moment().format('YYYY-MM-DD'),
      driver_id: '',
      vehicle_id: '',
      start_time: '08:00',
      end_time: '17:00',
      start_mileage: '',
      end_mileage: '',
      destination_id: '',
      destination_name: '',
      is_trainee: false,
      notes: ''
    });
    setFormValidated(false);
    setIsEdit(false);
    setCurrentLog(null);
  };

  // 編集モーダル表示
  const handleEdit = (log) => {
    setFormData({
      date: log.date,
      driver_id: log.driver.id.toString(),
      vehicle_id: log.vehicle.id.toString(),
      start_time: log.start_time,
      end_time: log.end_time,
      start_mileage: log.start_mileage.toString(),
      end_mileage: log.end_mileage.toString(),
      destination_id: log.destination.id ? log.destination.id.toString() : '',
      destination_name: log.destination.name || '',
      is_trainee: log.is_trainee,
      notes: log.notes || ''
    });
    setCurrentLog(log);
    setIsEdit(true);
    setShowModal(true);
  };

  // 新規登録モーダル表示
  const handleAdd = () => {
    resetForm();
    setShowModal(true);
  };

  // 削除
  const handleDelete = async (log) => {
    if (!confirm(`${moment(log.date).format('YYYY/MM/DD')}の${log.driver.name}の日報を削除しますか？`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/driving-log/logs/${log.id}/`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) throw new Error('削除エラー');

      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="text-center p-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">読み込み中...</span>
        </Spinner>
        <p className="mt-2">運転日報データを読み込んでいます...</p>
      </div>
    );
  }

  return (
    <Container fluid>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>運転日報管理</h1>
        <Button variant="primary" onClick={handleAdd}>
          新規日報登録
        </Button>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {/* フィルター */}
      <Card className="mb-4">
        <Card.Body>
          <Row>
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
                <Form.Label>ドライバー</Form.Label>
                <Form.Select
                  name="driver_id"
                  value={filters.driver_id}
                  onChange={handleFilterChange}
                >
                  <option value="">すべてのドライバー</option>
                  {drivers.map(driver => (
                    <option key={driver.id} value={driver.id}>
                      {driver.full_name}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>車両</Form.Label>
                <Form.Select
                  name="vehicle_id"
                  value={filters.vehicle_id}
                  onChange={handleFilterChange}
                >
                  <option value="">すべての車両</option>
                  {vehicles.map(vehicle => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.plate}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* 運転日報一覧 */}
      <Card>
        <Card.Body>
          {logs.length === 0 ? (
            <Alert variant="info">運転日報データがありません</Alert>
          ) : (
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>日付</th>
                  <th>ドライバー</th>
                  <th>車両</th>
                  <th>勤務時間</th>
                  <th>走行距離</th>
                  <th>配送先</th>
                  <th>見習い</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id}>
                    <td>{moment(log.date).format('YYYY/MM/DD')}</td>
                    <td>{log.driver.name}</td>
                    <td>{log.vehicle.plate}</td>
                    <td>
                      {log.start_time} - {log.end_time}
                      <br />
                      <small className="text-muted">({log.work_hours}時間)</small>
                    </td>
                    <td>
                      {log.start_mileage.toLocaleString()} → {log.end_mileage.toLocaleString()}km
                      <br />
                      <small className="text-muted">({log.daily_mileage.toLocaleString()}km)</small>
                    </td>
                    <td>{log.destination.name || '-'}</td>
                    <td>
                      {log.is_trainee && <Badge bg="warning">見習い</Badge>}
                    </td>
                    <td>
                      <div className="d-flex gap-1">
                        <Button size="sm" variant="warning" onClick={() => handleEdit(log)}>
                          編集
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => handleDelete(log)}>
                          削除
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* 登録・編集モーダル */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{isEdit ? '運転日報編集' : '運転日報登録'}</Modal.Title>
        </Modal.Header>
        <Form noValidate validated={formValidated} onSubmit={handleSubmit}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>日付 <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    日付を選択してください
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>ドライバー <span className="text-danger">*</span></Form.Label>
                  <Form.Select
                    name="driver_id"
                    value={formData.driver_id}
                    onChange={(e) => setFormData({...formData, driver_id: e.target.value})}
                    required
                  >
                    <option value="">ドライバーを選択</option>
                    {drivers.map(driver => (
                      <option key={driver.id} value={driver.id}>
                        {driver.full_name} ({driver.employee_code})
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">
                    ドライバーを選択してください
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>使用車両 <span className="text-danger">*</span></Form.Label>
                  <Form.Select
                    name="vehicle_id"
                    value={formData.vehicle_id}
                    onChange={(e) => setFormData({...formData, vehicle_id: e.target.value})}
                    required
                  >
                    <option value="">車両を選択</option>
                    {vehicles.map(vehicle => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.plate} ({vehicle.manufacturer})
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">
                    車両を選択してください
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>
                    <Form.Check
                      type="checkbox"
                      label="見習いドライバー"
                      checked={formData.is_trainee}
                      onChange={(e) => setFormData({...formData, is_trainee: e.target.checked})}
                      className="d-inline me-2"
                    />
                  </Form.Label>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>勤務開始時刻 <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="time"
                    name="start_time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    開始時刻を入力してください
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>勤務終了時刻 <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="time"
                    name="end_time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    終了時刻を入力してください
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>開始時走行距離 <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="number"
                    name="start_mileage"
                    value={formData.start_mileage}
                    onChange={(e) => setFormData({...formData, start_mileage: e.target.value})}
                    placeholder="例: 12345"
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    開始時走行距離を入力してください
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>終了時走行距離 <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="number"
                    name="end_mileage"
                    value={formData.end_mileage}
                    onChange={(e) => setFormData({...formData, end_mileage: e.target.value})}
                    placeholder="例: 12567"
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    終了時走行距離を入力してください
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>配送先</Form.Label>
                  <Form.Select
                    name="destination_id"
                    value={formData.destination_id}
                    onChange={(e) => setFormData({...formData, destination_id: e.target.value, destination_name: ''})}
                  >
                    <option value="">配送先を選択</option>
                    {destinations.map(dest => (
                      <option key={dest.id} value={dest.id}>
                        {dest.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>配送先名（手入力）</Form.Label>
                  <Form.Control
                    type="text"
                    name="destination_name"
                    value={formData.destination_name}
                    onChange={(e) => setFormData({...formData, destination_name: e.target.value, destination_id: ''})}
                    placeholder="マスタにない場合の配送先"
                    disabled={!!formData.destination_id}
                  />
                  <Form.Text className="text-muted">
                    上で配送先を選択した場合は入力不要
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>備考</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="notes"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="特記事項があれば入力してください"
              />
            </Form.Group>

            {/* 走行距離の計算表示 */}
            {formData.start_mileage && formData.end_mileage && (
              <Alert variant="info">
                <strong>1日の走行距離: </strong>
                {(parseInt(formData.end_mileage) - parseInt(formData.start_mileage)).toLocaleString()}km
              </Alert>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              キャンセル
            </Button>
            <Button variant="primary" type="submit">
              {isEdit ? '更新' : '登録'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
}