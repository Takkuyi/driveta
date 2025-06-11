// src/app/fuel/add/page.js
// src/app/fuel/[id]/edit/page.js も同様のコードを使用できます
'use client';

import { useState, useEffect } from 'react';
import { Container, Form, Button, Card, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import moment from 'moment';
import 'moment/locale/ja';

// API基本URLを定義
const API_BASE_URL = 'http://127.0.0.1:5000/api';

moment.locale('ja');

export default function FuelForm() {
  const params = useParams();
  const router = useRouter();
  const isEdit = params?.id !== undefined;
  const id = params?.id;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  
  const [formData, setFormData] = useState({
    vehicle_id: '',
    fuel_date: moment().format('YYYY-MM-DD'),
    fuel_amount: '',
    unit_price: '',
    fuel_cost: '',
    mileage: '',
    fuel_station: '',
    attendant: '',
    payment_method: 'cash',
    receipt_number: '',
    notes: ''
  });
  
  const [validated, setValidated] = useState(false);
  
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
        
        // 編集モードの場合、既存データを取得
        if (isEdit && id) {
          const fuelResponse = await fetch(`${API_BASE_URL}/fuel/records/${id}/`);
          if (!fuelResponse.ok) {
            throw new Error(`給油記録取得エラー: ${fuelResponse.status}`);
          }
          const fuelData = await fuelResponse.json();
          
          // データをフォームにセット
          setFormData({
            vehicle_id: fuelData.vehicle_id.toString(),
            fuel_date: fuelData.fuel_date,
            fuel_amount: fuelData.fuel_amount.toString(),
            unit_price: fuelData.unit_price.toString(),
            fuel_cost: fuelData.fuel_cost.toString(),
            mileage: fuelData.mileage?.toString() || '',
            fuel_station: fuelData.fuel_station || '',
            attendant: fuelData.attendant || '',
            payment_method: fuelData.payment_method || 'cash',
            receipt_number: fuelData.receipt_number || '',
            notes: fuelData.notes || ''
          });
        }
        
        setError(null);
      } catch (err) {
        console.error('データの取得に失敗しました:', err);
        setError(`データの取得に失敗しました。${err.message}`);
        
        // デモ用のダミー車両データ
        setVehicles([
          { id: 1, plate: '品川 800 あ 12-34', number: 'TRK-001' },
          { id: 2, plate: '品川 500 い 56-78', number: 'TRK-002' },
          { id: 3, plate: '品川 300 う 90-12', number: 'TRK-003' }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isEdit, id]);
  
  // フォーム入力値の変更ハンドラ
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // 給油量と単価が入力されたら自動で金額を計算
    if (name === 'fuel_amount' || name === 'unit_price') {
      const amount = name === 'fuel_amount' ? parseFloat(value) : parseFloat(formData.fuel_amount);
      const price = name === 'unit_price' ? parseFloat(value) : parseFloat(formData.unit_price);
      
      if (!isNaN(amount) && !isNaN(price)) {
        const cost = Math.round(amount * price);
        setFormData(prev => ({
          ...prev,
          [name]: value,
          fuel_cost: cost.toString()
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          [name]: value
        }));
      }
    }
  };
  
  // フォーム送信ハンドラ
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const form = e.currentTarget;
    
    if (form.checkValidity() === false) {
      e.stopPropagation();
      setValidated(true);
      return;
    }
    
    // APIに送信するデータを準備
    const apiData = {
      ...formData,
      vehicle_id: parseInt(formData.vehicle_id),
      fuel_amount: parseFloat(formData.fuel_amount),
      unit_price: parseFloat(formData.unit_price),
      fuel_cost: parseFloat(formData.fuel_cost),
      mileage: formData.mileage ? parseInt(formData.mileage) : null
    };
    
    try {
      setLoading(true);
      
      // APIエンドポイントとメソッドを決定
      const url = isEdit 
        ? `${API_BASE_URL}/fuel/records/${id}/` 
        : `${API_BASE_URL}/fuel/records/`;
        
      const method = isEdit ? 'PUT' : 'POST';
      
      // APIリクエスト
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(apiData)
      });
      
      if (!response.ok) {
        throw new Error(`${isEdit ? '更新' : '登録'}エラー: ${response.status}`);
      }
      
      const responseData = await response.json();
      
      // 成功
      alert(`給油記録を${isEdit ? '更新' : '登録'}しました`);
      
      // 一覧ページまたは詳細ページに遷移
      if (isEdit) {
        router.push(`/fuel/${id}`);
      } else {
        router.push('/fuel');
      }
    } catch (err) {
      console.error(`${isEdit ? '更新' : '登録'}エラー:`, err);
      setError(`${isEdit ? '更新' : '登録'}エラー: ${err.message}`);
      setLoading(false);
      
      // デモモードの場合は成功したふりをする
      setTimeout(() => {
        router.push('/fuel');
      }, 1000);
    }
  };
  
  if (loading && isEdit) {
    return (
      <div className="text-center p-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">読み込み中...</span>
        </Spinner>
        <p className="mt-2">データを読み込んでいます...</p>
      </div>
    );
  }
  
  if (error && !vehicles.length) {
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

  return (
    <Container>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>{isEdit ? '給油記録の編集' : '給油記録の登録'}</h1>
        <Link href="/fuel">
          <Button variant="outline-secondary">一覧に戻る</Button>
        </Link>
      </div>
      
      {error && (
        <Alert variant="warning" className="mb-4">
          {error}（デモモードで動作中）
        </Alert>
      )}
      
      <Card>
        <Card.Body>
          <Form noValidate validated={validated} onSubmit={handleSubmit}>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>車両 <span className="text-danger">*</span></Form.Label>
                  <Form.Select
                    name="vehicle_id"
                    value={formData.vehicle_id}
                    onChange={handleChange}
                    required
                  >
                    <option value="">車両を選択</option>
                    {vehicles.map(vehicle => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.plate || ''} ({vehicle.number || `ID:${vehicle.id}`})
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
                  <Form.Label>給油日 <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="date"
                    name="fuel_date"
                    value={formData.fuel_date}
                    onChange={handleChange}
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    給油日を入力してください
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>
            
            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>給油量（L） <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="number"
                    step="0.1"
                    name="fuel_amount"
                    value={formData.fuel_amount}
                    onChange={handleChange}
                    required
                    min="0"
                  />
                  <Form.Control.Feedback type="invalid">
                    給油量を入力してください
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>単価（円/L） <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="number"
                    step="0.1"
                    name="unit_price"
                    value={formData.unit_price}
                    onChange={handleChange}
                    required
                    min="0"
                  />
                  <Form.Control.Feedback type="invalid">
                    単価を入力してください
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>金額（円） <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="number"
                    name="fuel_cost"
                    value={formData.fuel_cost}
                    onChange={handleChange}
                    required
                    min="0"
                  />
                  <Form.Control.Feedback type="invalid">
                    金額を入力してください
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>
            
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>走行距離（km）</Form.Label>
                  <Form.Control
                    type="number"
                    name="mileage"
                    value={formData.mileage}
                    onChange={handleChange}
                    min="0"
                  />
                </Form.Group>
              </Col>
              
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>給油所 <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="text"
                    name="fuel_station"
                    value={formData.fuel_station}
                    onChange={handleChange}
                    required
                    placeholder="例：ENEOS 高崎インター店"
                  />
                  <Form.Control.Feedback type="invalid">
                    給油所を入力してください
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>
            
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>担当者</Form.Label>
                  <Form.Control
                    type="text"
                    name="attendant"
                    value={formData.attendant}
                    onChange={handleChange}
                    placeholder="給油担当者名"
                  />
                </Form.Group>
              </Col>
              
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>支払方法</Form.Label>
                  <Form.Select
                    name="payment_method"
                    value={formData.payment_method}
                    onChange={handleChange}
                  >
                    <option value="cash">現金</option>
                    <option value="card">カード</option>
                    <option value="corporate_card">法人カード</option>
                    <option value="fuel_card">給油カード</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>レシート番号</Form.Label>
                  <Form.Control
                    type="text"
                    name="receipt_number"
                    value={formData.receipt_number}
                    onChange={handleChange}
                    placeholder="レシート番号（任意）"
                  />
                </Form.Group>
              </Col>
              
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>備考</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    placeholder="備考があれば記入してください"
                  />
                </Form.Group>
              </Col>
            </Row>
            
            <hr className="my-4" />
            
            <div className="d-flex justify-content-between">
              <Link href="/fuel">
                <Button variant="secondary">キャンセル</Button>
              </Link>
              <Button type="submit" variant="primary" disabled={loading}>
                {loading ? '処理中...' : (isEdit ? '更新する' : '登録する')}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
}