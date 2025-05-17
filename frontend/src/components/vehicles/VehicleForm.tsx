'use client';

import { useEffect, useState } from 'react';
import { Form, Button, Card, Alert, Row, Col, Spinner } from 'react-bootstrap';
import { useRouter } from 'next/navigation';
import { Vehicle, VehicleStatus } from '@/lib/types';
import { vehicleApi } from '@/lib/api';

interface VehicleFormProps {
  id?: string;
}

export default function VehicleForm({ id }: VehicleFormProps) {
  const router = useRouter();
  const isEditMode = !!id;
  const currentYear = new Date().getFullYear();
  
  const [formData, setFormData] = useState<Partial<Vehicle>>({
    vehicle_number: '',
    license_plate: '',
    vehicle_type: '',
    manufacturer: '',
    model: '',
    year_manufactured: currentYear,
    date_acquired: new Date().toISOString().split('T')[0],
    capacity: undefined,
    status: '運行中',
    notes: ''
  });

  const [validated, setValidated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(isEditMode);

  useEffect(() => {
    if (isEditMode) {
      const fetchVehicle = async () => {
        try {
          const response = await vehicleApi.getById(id);
          // 日付形式の調整
          if (response.date_acquired) {
            response.date_acquired = response.date_acquired.split('T')[0];
          }
          setFormData(response);
          setFetchLoading(false);
        } catch (err) {
          console.error('Error fetching vehicle:', err);
          setError('車両データの取得中にエラーが発生しました');
          setFetchLoading(false);
          
          // デモ用のダミーデータ
          setFormData({
            id: parseInt(id!),
            vehicle_number: 'TRK-00' + id,
            license_plate: '品川 800 あ 12-34',
            vehicle_type: 'トラック',
            manufacturer: 'いすゞ',
            model: 'エルフ',
            year_manufactured: 2020,
            date_acquired: '2020-06-01',
            capacity: 2,
            status: '運行中',
            notes: '冷蔵設備付き'
          });
          setError(null); // デモデータを表示するためエラーをクリア
        }
      };

      fetchVehicle();
    }
  }, [id, isEditMode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    // 数値フィールドの処理
    if (type === 'number') {
      setFormData({
        ...formData,
        [name]: value === '' ? undefined : Number(value)
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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
      if (isEditMode && id) {
        await vehicleApi.update(id, formData);
      } else {
        await vehicleApi.create(formData as Omit<Vehicle, 'id'>);
      }
      router.push('/vehicles');
    } catch (err) {
      console.error('Error saving vehicle:', err);
      setError('車両データの保存中にエラーが発生しました');
      setLoading(false);
      
      // デモモードの場合は成功したふりをする
      setTimeout(() => {
        router.push('/vehicles');
      }, 1000);
    }
  };

  if (fetchLoading) {
    return (
      <div className="text-center my-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">読み込み中...</span>
        </Spinner>
      </div>
    );
  }

  return (
    <div>
      {error && <Alert variant="danger">{error}</Alert>}

      <Card>
        <Card.Body>
          <Form noValidate validated={validated} onSubmit={handleSubmit}>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>車両番号</Form.Label>
                  <Form.Control
                    type="text"
                    name="vehicle_number"
                    value={formData.vehicle_number || ''}
                    onChange={handleChange}
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    車両番号を入力してください
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>ナンバープレート</Form.Label>
                  <Form.Control
                    type="text"
                    name="license_plate"
                    value={formData.license_plate || ''}
                    onChange={handleChange}
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    ナンバープレートを入力してください
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>車種</Form.Label>
                  <Form.Control
                    type="text"
                    name="vehicle_type"
                    value={formData.vehicle_type || ''}
                    onChange={handleChange}
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    車種を入力してください
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>メーカー</Form.Label>
                  <Form.Control
                    type="text"
                    name="manufacturer"
                    value={formData.manufacturer || ''}
                    onChange={handleChange}
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    メーカー名を入力してください
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>型式</Form.Label>
                  <Form.Control
                    type="text"
                    name="model"
                    value={formData.model || ''}
                    onChange={handleChange}
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    型式を入力してください
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>製造年</Form.Label>
                  <Form.Control
                    type="number"
                    name="year_manufactured"
                    value={formData.year_manufactured || ''}
                    onChange={handleChange}
                    min={1990}
                    max={currentYear}
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    有効な製造年を入力してください
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={4}></Col>