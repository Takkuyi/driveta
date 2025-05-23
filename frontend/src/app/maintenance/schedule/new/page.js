// src/app/maintenance/schedule/new/page.js
// src/app/maintenance/schedule/[id]/edit/page.js も同様のコードを使用できます
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

export default function MaintenanceScheduleForm() {
  const params = useParams();
  const router = useRouter();
  const isEdit = params?.id !== undefined;
  const id = params?.id;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [maintenanceTypes, setMaintenanceTypes] = useState([]);
  const [statuses, setStatuses] = useState([]);

  const [employees, setEmployees] = useState([]);
  const [mechanics, setMechanics] = useState([]); // 整備士のみのリスト
  
  const [formData, setFormData] = useState({
    vehicle_id: '',
    maintenance_type_id: '',
    scheduled_date: moment().format('YYYY-MM-DD'),
    completion_date: '',
    status_id: '',
    technician_id: '', // ここを追加（技術者IDフィールド）
    technician: '',   // 名前のみの場合のためのフィールド
    location: '',
    cost: '',
    notes: '',
    details: []
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
        
        // 点検種類一覧を取得
        const typesResponse = await fetch(`${API_BASE_URL}/maintenance/types/`);
        if (!typesResponse.ok) {
          throw new Error(`点検種類取得エラー: ${typesResponse.status}`);
        }
        const typesData = await typesResponse.json();
        setMaintenanceTypes(typesData);
        
        // 整備状態一覧を取得
        const statusesResponse = await fetch(`${API_BASE_URL}/maintenance/statuses/`);
        if (!statusesResponse.ok) {
          throw new Error(`整備状態取得エラー: ${statusesResponse.status}`);
        }
        const statusesData = await statusesResponse.json();
        setStatuses(statusesData);

        // 従業員一覧を取得（整備士フラグがtrueのもののみ）
        const employeesResponse = await fetch(`${API_BASE_URL}/employee/?is_mechanic=true&is_active=true`);
        if (!employeesResponse.ok) {
          throw new Error(`従業員データ取得エラー: ${employeesResponse.status}`);
        }
        const employeesData = await employeesResponse.json();
        setEmployees(employeesData);
        setMechanics(employeesData.filter(emp => emp.is_mechanic));
        
        console.log("取得した整備士一覧:", employeesData.filter(emp => emp.is_mechanic));

        // 編集モードの場合、既存データを取得
        if (isEdit && id) {
          const scheduleResponse = await fetch(`${API_BASE_URL}/maintenance/schedules/${id}/`);
          if (!scheduleResponse.ok) {
            throw new Error(`点検予定取得エラー: ${scheduleResponse.status}`);
          }
          const scheduleData = await scheduleResponse.json();
          
          // 技術者IDが存在するか確認
          const technicianId = scheduleData.technician_id ? scheduleData.technician_id.toString() : '';
          
          // データをフォームにセット
          setFormData({
            vehicle_id: scheduleData.vehicle_id.toString(),
            maintenance_type_id: scheduleData.maintenance_type.id.toString(),
            scheduled_date: scheduleData.scheduled_date,
            completion_date: scheduleData.completion_date || '',
            status_id: scheduleData.status.id.toString(),
            technician_id: technicianId, // 技術者ID
            technician: scheduleData.technician || '', // 技術者名
            location: scheduleData.location || '',
            cost: scheduleData.cost || '',
            notes: scheduleData.notes || '',
            details: scheduleData.details || []
          });
        } else {
          // 新規作成の場合、デフォルト値を設定
          // 予定状態のIDを取得
          const scheduledStatus = statusesData.find(s => s.name === '予定');
          if (scheduledStatus) {
            setFormData(prev => ({
              ...prev,
              status_id: scheduledStatus.id.toString()
            }));
          }
        }
        
        setError(null);
      } catch (err) {
        console.error('データの取得に失敗しました:', err);
        setError(`データの取得に失敗しました。${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isEdit, id]);
  
  // フォーム入力値の変更ハンドラ
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  // 点検項目の追加
  const addDetailItem = () => {
    setFormData({
      ...formData,
      details: [
        ...formData.details,
        {
          item_name: '',
          result: '',
          is_ok: null,
          action_taken: '',
          parts_used: '',
          parts_cost: '',
          notes: ''
        }
      ]
    });
  };
  
  // 点検項目の変更ハンドラ
  const handleDetailChange = (index, field, value) => {
    const updatedDetails = [...formData.details];
    updatedDetails[index][field] = value;
    setFormData({
      ...formData,
      details: updatedDetails
    });
  };
  
  // 点検項目の削除
  const removeDetailItem = (index) => {
    const updatedDetails = [...formData.details];
    updatedDetails.splice(index, 1);
    setFormData({
      ...formData,
      details: updatedDetails
    });
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
      maintenance_type_id: parseInt(formData.maintenance_type_id),
      status_id: parseInt(formData.status_id),
      technician_id: formData.technician_id ? parseInt(formData.technician_id) : null,
      cost: formData.cost ? parseFloat(formData.cost) : null
    };
    
    // 技術者が選択されている場合、対応する名前を取得
    if (apiData.technician_id) {
      const selectedMechanic = mechanics.find(m => m.id === apiData.technician_id);
      if (selectedMechanic) {
        apiData.technician = selectedMechanic.full_name;
      }
    }
    
    // 詳細項目のデータも整形
    if (apiData.details && apiData.details.length > 0) {
      apiData.details = apiData.details.map(detail => ({
        ...detail,
        is_ok: detail.is_ok === 'true' ? true : detail.is_ok === 'false' ? false : null,
        parts_cost: detail.parts_cost ? parseFloat(detail.parts_cost) : null
      }));
    }
    
    try {
      setLoading(true);
      
      // APIエンドポイントとメソッドを決定
      const url = isEdit 
        ? `${API_BASE_URL}/maintenance/schedules/${id}/` 
        : `${API_BASE_URL}/maintenance/schedules/`;
        
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
      alert(`点検予定を${isEdit ? '更新' : '登録'}しました`);
      
      // 一覧ページまたは詳細ページに遷移
      if (isEdit) {
        router.push(`/maintenance/schedule/${id}`);
      } else {
        router.push('/maintenance/schedule');
      }
    } catch (err) {
      console.error(`${isEdit ? '更新' : '登録'}エラー:`, err);
      setError(`${isEdit ? '更新' : '登録'}エラー: ${err.message}`);
      setLoading(false);
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
  
  if (error) {
    return (
      <Alert variant="danger">
        <Alert.Heading>エラーが発生しました</Alert.Heading>
        <p>{error}</p>
        <hr />
        <div className="d-flex justify-content-between">
          <Link href="/maintenance/schedule">
            <Button variant="outline-primary">点検一覧に戻る</Button>
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
        <h1>{isEdit ? '点検予定の編集' : '点検予定の登録'}</h1>
        <Link href="/maintenance/schedule">
          <Button variant="outline-secondary">一覧に戻る</Button>
        </Link>
      </div>
      
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
                        {vehicle.plate || ''} {vehicle.number ? `(${vehicle.number})` : ''}
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
                  <Form.Label>点検種類 <span className="text-danger">*</span></Form.Label>
                  <Form.Select
                    name="maintenance_type_id"
                    value={formData.maintenance_type_id}
                    onChange={handleChange}
                    required
                  >
                    <option value="">点検種類を選択</option>
                    {maintenanceTypes.map(type => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">
                    点検種類を選択してください
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>
            
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>予定日 <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="date"
                    name="scheduled_date"
                    value={formData.scheduled_date}
                    onChange={handleChange}
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    予定日を入力してください
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>状態 <span className="text-danger">*</span></Form.Label>
                  <Form.Select
                    name="status_id"
                    value={formData.status_id}
                    onChange={handleChange}
                    required
                  >
                    <option value="">状態を選択</option>
                    {statuses.map(status => (
                      <option key={status.id} value={status.id}>
                        {status.name}
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">
                    状態を選択してください
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>
            
            {formData.status_id && statuses.find(s => s.id.toString() === formData.status_id)?.name === '完了' && (
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>完了日 <span className="text-danger">*</span></Form.Label>
                    <Form.Control
                      type="date"
                      name="completion_date"
                      value={formData.completion_date}
                      onChange={handleChange}
                      required
                    />
                    <Form.Control.Feedback type="invalid">
                      完了日を入力してください
                    </Form.Control.Feedback>
                  </Form.Group>
                </Col>
              </Row>
            )}
            
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                <Form.Label>担当者</Form.Label>
                <Form.Select
                  name="technician_id"
                  value={formData.technician_id || ''}
                  onChange={handleChange}
                >
                  <option value="">担当者を選択</option>
                  {mechanics.map(emp => (
                    <option key={emp.id} value={emp.id.toString()}>
                      {emp.full_name} {emp.department ? `(${emp.department})` : ''}
                    </option>
                  ))}
                </Form.Select>
                {!formData.technician_id && formData.technician && (
                  <Form.Text className="text-muted">
                    現在の担当者: {formData.technician} (従業員マスタに未登録)
                  </Form.Text>
                )}
              </Form.Group>
              </Col>
              
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>実施場所</Form.Label>
                  <Form.Control
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                  />
                </Form.Group>
              </Col>
            </Row>
            
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>費用</Form.Label>
                  <Form.Control
                    type="number"
                    name="cost"
                    value={formData.cost}
                    onChange={handleChange}
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
                  />
                </Form.Group>
              </Col>
            </Row>
            
            <hr className="my-4" />
            
            <h4>点検項目詳細</h4>
            <p className="text-muted">点検の詳細項目がある場合は追加してください</p>
            
            {formData.details.map((detail, index) => (
              <Card key={index} className="mb-3 border-light">
                <Card.Body>
                  <div className="d-flex justify-content-between mb-3">
                    <h5 className="mb-0">点検項目 #{index + 1}</h5>
                    <Button 
                      variant="outline-danger" 
                      size="sm"
                      onClick={() => removeDetailItem(index)}
                    >
                      削除
                    </Button>
                  </div>
                  
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>項目名 <span className="text-danger">*</span></Form.Label>
                        <Form.Control
                          type="text"
                          value={detail.item_name}
                          onChange={(e) => handleDetailChange(index, 'item_name', e.target.value)}
                          required
                        />
                      </Form.Group>
                    </Col>
                    
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>結果</Form.Label>
                        <Form.Control
                          type="text"
                          value={detail.result || ''}
                          onChange={(e) => handleDetailChange(index, 'result', e.target.value)}
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                  
                  <Row>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>合否</Form.Label>
                        <Form.Select
                          value={detail.is_ok === null ? '' : detail.is_ok.toString()}
                          onChange={(e) => handleDetailChange(index, 'is_ok', e.target.value)}
                        >
                          <option value="">選択なし</option>
                          <option value="true">合格</option>
                          <option value="false">不合格</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    
                    <Col md={8}>
                      <Form.Group className="mb-3">
                        <Form.Label>実施内容</Form.Label>
                        <Form.Control
                          type="text"
                          value={detail.action_taken || ''}
                          onChange={(e) => handleDetailChange(index, 'action_taken', e.target.value)}
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                  
                  <Row>
                    <Col md={8}>
                      <Form.Group className="mb-3">
                        <Form.Label>使用部品</Form.Label>
                        <Form.Control
                          type="text"
                          value={detail.parts_used || ''}
                          onChange={(e) => handleDetailChange(index, 'parts_used', e.target.value)}
                        />
                     </Form.Group>
                   </Col>
                   
                   <Col md={4}>
                     <Form.Group className="mb-3">
                       <Form.Label>部品費用</Form.Label>
                       <Form.Control
                         type="number"
                         value={detail.parts_cost || ''}
                         onChange={(e) => handleDetailChange(index, 'parts_cost', e.target.value)}
                       />
                     </Form.Group>
                   </Col>
                 </Row>
                 
                 <Form.Group className="mb-3">
                   <Form.Label>備考</Form.Label>
                   <Form.Control
                     type="text"
                     value={detail.notes || ''}
                     onChange={(e) => handleDetailChange(index, 'notes', e.target.value)}
                   />
                 </Form.Group>
               </Card.Body>
             </Card>
           ))}
           
           <div className="d-grid mb-4">
             <Button variant="outline-secondary" onClick={addDetailItem}>
               + 点検項目を追加
             </Button>
           </div>
           
           <div className="d-flex justify-content-between">
             <Link href="/maintenance/schedule">
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