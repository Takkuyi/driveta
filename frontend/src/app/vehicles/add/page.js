// frontend/src/app/vehicles/add/page.js
'use client';

import { useState } from 'react';
import { Container, Form, Button, Card, Row, Col, Alert } from 'react-bootstrap';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const API_BASE_URL = 'http://127.0.0.1:5000/api';

export default function VehicleAddPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    plate: '',                    // ナンバープレート
    chassisNumber: '',           // 車台番号
    engineModel: '',             // 原動機型式
    modelType: '',               // 型式
    firstRegistrationDate: '',   // 初年度登録年月（YYMM形式）
    manufacturer: '',            // メーカー（車名）
    expiryDate: '',             // 車検有効期限（YYYYMMDD形式）
    status: '運行中',            // ステータス
    fuelTypeCode: '',           // 燃料種別コード
    noiseRegulation: '',        // 騒音規制
    driveSystem: '',            // 駆動方式
    notes: ''                   // 備考
  });

  const [validated, setValidated] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;

    if (form.checkValidity() === false) {
      e.stopPropagation();
      setValidated(true);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 日付フォーマットの変換
      const apiData = {
        自動車登録番号および車両番号: formData.plate,
        車台番号: formData.chassisNumber,
        原動機型式: formData.engineModel,
        型式: formData.modelType,
        初年度登録年月: formData.firstRegistrationDate,
        車名: formData.manufacturer,
        有効期間の満了する日: formData.expiryDate ? parseInt(formData.expiryDate) : null,
        ステータス: formData.status,
        燃料の種類コード: formData.fuelTypeCode ? parseInt(formData.fuelTypeCode) : null,
        騒音規制: formData.noiseRegulation,
        駆動方式: formData.driveSystem
      };

      const response = await fetch(`${API_BASE_URL}/vehicles/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(apiData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `登録エラー: ${response.status}`);
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/vehicles');
      }, 2000);

    } catch (err) {
      console.error('車両登録エラー:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Container>
        <Alert variant="success" className="text-center">
          <h4>車両登録が完了しました</h4>
          <p>車両一覧ページに移動します...</p>
        </Alert>
      </Container>
    );
  }

  return (
    <Container>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>新規車両登録</h1>
        <Link href="/vehicles">
          <Button variant="outline-secondary">車両一覧に戻る</Button>
        </Link>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      <Card>
        <Card.Body>
          <Form noValidate validated={validated} onSubmit={handleSubmit}>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>ナンバープレート <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="text"
                    name="plate"
                    value={formData.plate}
                    onChange={handleChange}
                    placeholder="例: 群馬 800 あ 1234"
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    ナンバープレートを入力してください
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>車台番号 <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="text"
                    name="chassisNumber"
                    value={formData.chassisNumber}
                    onChange={handleChange}
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    車台番号を入力してください
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>メーカー・車名 <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="text"
                    name="manufacturer"
                    value={formData.manufacturer}
                    onChange={handleChange}
                    placeholder="例: いすゞ エルフ"
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    メーカー・車名を入力してください
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>型式</Form.Label>
                  <Form.Control
                    type="text"
                    name="modelType"
                    value={formData.modelType}
                    onChange={handleChange}
                    placeholder="例: TKG-NPR85AR"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>原動機型式</Form.Label>
                  <Form.Control
                    type="text"
                    name="engineModel"
                    value={formData.engineModel}
                    onChange={handleChange}
                    placeholder="例: 4JJ1-TCS"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>初年度登録年月</Form.Label>
                  <Form.Control
                    type="text"
                    name="firstRegistrationDate"
                    value={formData.firstRegistrationDate}
                    onChange={handleChange}
                    placeholder="例: 2103 (2021年3月)"
                    pattern="[0-9]{4}"
                    maxLength="4"
                  />
                  <Form.Text className="text-muted">
                    YYMM形式で入力 (例: 2103 = 2021年3月)
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>車検有効期限</Form.Label>
                  <Form.Control
                    type="text"
                    name="expiryDate"
                    value={formData.expiryDate}
                    onChange={handleChange}
                    placeholder="例: 20250315 (2025年3月15日)"
                    pattern="[0-9]{8}"
                    maxLength="8"
                  />
                  <Form.Text className="text-muted">
                    YYYYMMDD形式で入力 (例: 20250315)
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>ステータス <span className="text-danger">*</span></Form.Label>
                  <Form.Select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    required
                  >
                    <option value="運行中">運行中</option>
                    <option value="整備中">整備中</option>
                    <option value="待機中">待機中</option>
                    <option value="廃車">廃車</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>燃料種別コード</Form.Label>
                  <Form.Control
                    type="number"
                    name="fuelTypeCode"
                    value={formData.fuelTypeCode}
                    onChange={handleChange}
                    placeholder="例: 1"
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>騒音規制</Form.Label>
                  <Form.Control
                    type="text"
                    name="noiseRegulation"
                    value={formData.noiseRegulation}
                    onChange={handleChange}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>駆動方式</Form.Label>
                  <Form.Control
                    type="text"
                    name="driveSystem"
                    value={formData.driveSystem}
                    onChange={handleChange}
                    placeholder="例: 4×2"
                  />
                </Form.Group>
              </Col>
            </Row>

            <div className="d-flex justify-content-between mt-4">
              <Link href="/vehicles">
                <Button variant="secondary">キャンセル</Button>
              </Link>
              <Button type="submit" variant="primary" disabled={loading}>
                {loading ? '登録中...' : '車両を登録'}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
}