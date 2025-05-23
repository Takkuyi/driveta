// src/app/maintenance/schedule/[id]/page.js
'use client';

import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Alert, Spinner, Modal } from 'react-bootstrap';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import moment from 'moment';
import 'moment/locale/ja';

// API基本URLを定義
const API_BASE_URL = 'http://127.0.0.1:5000/api';

moment.locale('ja');

export default function MaintenanceScheduleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { id } = params;
  
  const [schedule, setSchedule] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completionData, setCompletionData] = useState({
    completion_date: moment().format('YYYY-MM-DD'),
    technician: '',
    notes: ''
  });

  // 点検詳細データを取得
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // 点検予定詳細を取得
        const response = await fetch(`${API_BASE_URL}/maintenance/schedules/${id}/`);
        
        if (!response.ok) {
          throw new Error(`点検予定取得エラー: ${response.status}`);
        }
        
        const data = await response.json();
        setSchedule(data);
        
        // 車両情報があれば設定
        if (data.vehicle_info) {
          setVehicle(data.vehicle_info);
        } else if (data.vehicle_id) {
          // 車両詳細を取得
          const vehicleResponse = await fetch(`${API_BASE_URL}/vehicles/${data.vehicle_id}/`);
          if (vehicleResponse.ok) {
            const vehicleData = await vehicleResponse.json();
            setVehicle(vehicleData);
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

    if (id) {
      fetchData();
    }
  }, [id]);
  
  // 点検予定の削除
  const deleteSchedule = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`${API_BASE_URL}/maintenance/schedules/${id}/`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error(`削除エラー: ${response.status}`);
      }
      
      // 削除成功
      alert('点検予定を削除しました');
      router.push('/maintenance/schedule');
    } catch (err) {
      console.error('削除エラー:', err);
      setError(`削除エラー: ${err.message}`);
      setShowDeleteModal(false);
    } finally {
      setLoading(false);
    }
  };
  
  // 点検の完了処理
  const completeSchedule = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`${API_BASE_URL}/maintenance/schedules/${id}/complete/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(completionData)
      });
      
      if (!response.ok) {
        throw new Error(`完了処理エラー: ${response.status}`);
      }
      
      // 完了処理成功
      alert('点検を完了処理しました');
      setShowCompleteModal(false);
      
      // データを再読み込み
      const refreshResponse = await fetch(`${API_BASE_URL}/maintenance/schedules/${id}/`);
      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        setSchedule(refreshData);
      }
    } catch (err) {
      console.error('完了処理エラー:', err);
      setError(`完了処理エラー: ${err.message}`);
      setShowCompleteModal(false);
    } finally {
      setLoading(false);
    }
  };
  
  // 状態に基づくバッジの表示
  const getStatusBadge = () => {
    if (!schedule || !schedule.status) return null;
    
    let variant;
    switch (schedule.status.name) {
      case '完了':
        variant = 'success';
        break;
      case '予定':
        variant = 'primary';
        break;
      case '未実施':
        variant = 'danger';
        break;
      default:
        variant = 'secondary';
    }
    
    return <Badge bg={variant}>{schedule.status.name}</Badge>;
  };
  
  if (loading) {
    return (
      <div className="text-center p-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">読み込み中...</span>
        </Spinner>
        <p className="mt-2">点検データを読み込んでいます...</p>
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
  
  if (!schedule) {
    return (
      <Alert variant="warning">
        <Alert.Heading>点検データが見つかりません</Alert.Heading>
        <p>指定された点検ID ({id}) の情報が見つかりませんでした。</p>
        <hr />
        <div className="d-flex justify-content-start">
          <Link href="/maintenance/schedule">
            <Button variant="outline-primary">点検一覧に戻る</Button>
          </Link>
        </div>
      </Alert>
    );
  }

  return (
    <Container>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>点検詳細</h1>
        <div className="d-flex gap-2">
          <Link href="/maintenance/schedule">
            <Button variant="outline-secondary">一覧に戻る</Button>
          </Link>
          
          {schedule.status.name === '予定' && (
            <Button 
              variant="success" 
              onClick={() => setShowCompleteModal(true)}
            >
              完了登録
            </Button>
          )}
        <Link href={`/maintenance/schedule/${id}/edit`}>
           <Button variant="warning">編集</Button>
         </Link>
         <Button 
           variant="danger" 
           onClick={() => setShowDeleteModal(true)}
         >
           削除
         </Button>
       </div>
     </div>
     
     <Row>
       <Col md={8}>
         <Card className="mb-4">
           <Card.Header>
             <div className="d-flex justify-content-between align-items-center">
               <h5 className="mb-0">点検情報</h5>
               {getStatusBadge()}
             </div>
           </Card.Header>
           <Card.Body>
             <Table bordered>
               <tbody>
                 <tr>
                   <th style={{ width: '30%' }}>点検種類</th>
                   <td>{schedule.maintenance_type.name}</td>
                 </tr>
                 <tr>
                   <th>車両</th>
                   <td>
                     <Link href={`/vehicles/${schedule.vehicle_id}`}>
                       {vehicle?.plate || ''} {vehicle?.number ? `(${vehicle.number})` : ''}
                     </Link>
                   </td>
                 </tr>
                 <tr>
                   <th>予定日</th>
                   <td>{moment(schedule.scheduled_date).format('YYYY年MM月DD日')}</td>
                 </tr>
                 <tr>
                   <th>完了日</th>
                   <td>
                     {schedule.completion_date 
                       ? moment(schedule.completion_date).format('YYYY年MM月DD日')
                       : '-'}
                   </td>
                 </tr>
                 <tr>
                   <th>担当者</th>
                   <td>{schedule.technician || '-'}</td>
                 </tr>
                 <tr>
                   <th>実施場所</th>
                   <td>{schedule.location || '-'}</td>
                 </tr>
                 <tr>
                   <th>費用</th>
                   <td>{schedule.cost ? `${schedule.cost.toLocaleString()}円` : '-'}</td>
                 </tr>
                 <tr>
                   <th>備考</th>
                   <td>{schedule.notes || '-'}</td>
                 </tr>
               </tbody>
             </Table>
           </Card.Body>
         </Card>
         
         {/* 点検詳細項目 */}
         {schedule.details && schedule.details.length > 0 && (
           <Card className="mb-4">
             <Card.Header>
               <h5 className="mb-0">点検項目詳細</h5>
             </Card.Header>
             <Card.Body>
               <Table striped bordered>
                 <thead>
                   <tr>
                     <th>項目名</th>
                     <th>結果</th>
                     <th>実施内容</th>
                     <th>使用部品</th>
                     <th>部品費用</th>
                   </tr>
                 </thead>
                 <tbody>
                   {schedule.details.map((detail, index) => (
                     <tr key={index}>
                       <td>{detail.item_name}</td>
                       <td>
                         {detail.is_ok !== null && (
                           <Badge bg={detail.is_ok ? 'success' : 'danger'}>
                             {detail.is_ok ? '合格' : '不合格'}
                           </Badge>
                         )}
                         {detail.result && <span className="ms-1">{detail.result}</span>}
                       </td>
                       <td>{detail.action_taken || '-'}</td>
                       <td>{detail.parts_used || '-'}</td>
                       <td>
                         {detail.parts_cost 
                           ? `${detail.parts_cost.toLocaleString()}円` 
                           : '-'}
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </Table>
             </Card.Body>
           </Card>
         )}
       </Col>
       
       <Col md={4}>
         <Card className="mb-4">
           <Card.Header className="bg-info text-white">
             <h5 className="mb-0">車両情報</h5>
           </Card.Header>
           <Card.Body>
             {vehicle ? (
               <>
                 <p className="mb-2">
                   <strong>ナンバープレート:</strong><br />
                   {vehicle.plate || '-'}
                 </p>
                 <p className="mb-2">
                   <strong>車両番号:</strong><br />
                   {vehicle.number || '-'}
                 </p>
                 <p className="mb-2">
                   <strong>メーカー:</strong><br />
                   {vehicle.manufacturer || '-'}
                 </p>
                 <div className="d-grid gap-2 mt-3">
                   <Link href={`/vehicles/${schedule.vehicle_id}`}>
                     <Button variant="outline-info" className="w-100">
                       車両詳細を見る
                     </Button>
                   </Link>
                   <Link href={`/vehicles/${schedule.vehicle_id}/maintenance`}>
                     <Button variant="outline-secondary" className="w-100">
                       この車両の整備履歴
                     </Button>
                   </Link>
                 </div>
               </>
             ) : (
               <p className="text-center">車両情報を取得できません</p>
             )}
           </Card.Body>
         </Card>
         
         {/* 状態に応じた情報表示 */}
         {schedule.status.name === '予定' && (
           <Card className="mb-4 border-primary">
             <Card.Header className="bg-primary text-white">
               <h5 className="mb-0">点検予定</h5>
             </Card.Header>
             <Card.Body>
               <p>
                 この点検は<strong>予定</strong>状態です。
                 {moment(schedule.scheduled_date).isAfter(moment()) ? (
                   <>
                     <br />
                     予定日まであと<strong>{moment(schedule.scheduled_date).diff(moment(), 'days')}</strong>日です。
                   </>
                 ) : (
                   <>
                     <br />
                     <span className="text-danger">
                       予定日から<strong>{moment().diff(moment(schedule.scheduled_date), 'days')}</strong>日経過しています。
                     </span>
                   </>
                 )}
               </p>
               <div className="d-grid">
                 <Button 
                   variant="success" 
                   className="w-100" 
                   onClick={() => setShowCompleteModal(true)}
                 >
                   点検完了登録
                 </Button>
               </div>
             </Card.Body>
           </Card>
         )}
         
         {schedule.status.name === '完了' && (
           <Card className="mb-4 border-success">
             <Card.Header className="bg-success text-white">
               <h5 className="mb-0">点検完了</h5>
             </Card.Header>
             <Card.Body>
               <p>
                 この点検は<strong>完了</strong>しています。<br />
                 完了日: {moment(schedule.completion_date).format('YYYY年MM月DD日')}
               </p>
               <p>
                 次回の点検予定を登録しましょう。
               </p>
               <div className="d-grid">
                 <Link href="/maintenance/schedule/new">
                   <Button variant="outline-success" className="w-100">
                     次回点検を登録
                   </Button>
                 </Link>
               </div>
             </Card.Body>
           </Card>
         )}
         
         {schedule.status.name === '未実施' && (
           <Card className="mb-4 border-danger">
             <Card.Header className="bg-danger text-white">
               <h5 className="mb-0">未実施の点検</h5>
             </Card.Header>
             <Card.Body>
               <p>
                 この点検は<strong>未実施</strong>状態です。<br />
                 予定日から<strong>{moment().diff(moment(schedule.scheduled_date), 'days')}</strong>日経過しています。
               </p>
               <div className="d-grid gap-2">
                 <Button 
                   variant="success" 
                   className="w-100" 
                   onClick={() => setShowCompleteModal(true)}
                 >
                   点検完了登録
                 </Button>
                 <Link href={`/maintenance/schedule/${id}/edit`}>
                   <Button variant="outline-warning" className="w-100">
                     予定日を変更
                   </Button>
                 </Link>
               </div>
             </Card.Body>
           </Card>
         )}
       </Col>
     </Row>
     
     {/* 削除確認モーダル */}
     <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
       <Modal.Header closeButton>
         <Modal.Title>削除の確認</Modal.Title>
       </Modal.Header>
       <Modal.Body>
         <p>この点検予定を削除しますか？</p>
         <p>
           <strong>点検種類:</strong> {schedule.maintenance_type.name}<br />
           <strong>車両:</strong> {vehicle?.plate || schedule.vehicle_id}<br />
           <strong>予定日:</strong> {moment(schedule.scheduled_date).format('YYYY年MM月DD日')}
         </p>
         <p className="text-danger">この操作は元に戻せません。</p>
       </Modal.Body>
       <Modal.Footer>
         <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
           キャンセル
         </Button>
         <Button variant="danger" onClick={deleteSchedule} disabled={loading}>
           {loading ? '処理中...' : '削除する'}
         </Button>
       </Modal.Footer>
     </Modal>
     
     {/* 完了登録モーダル */}
     <Modal show={showCompleteModal} onHide={() => setShowCompleteModal(false)}>
       <Modal.Header closeButton>
         <Modal.Title>点検完了登録</Modal.Title>
       </Modal.Header>
       <Modal.Body>
         <Form>
           <Form.Group className="mb-3">
             <Form.Label>完了日</Form.Label>
             <Form.Control
               type="date"
               value={completionData.completion_date}
               onChange={(e) => setCompletionData({
                 ...completionData,
                 completion_date: e.target.value
               })}
             />
           </Form.Group>
           <Form.Group className="mb-3">
             <Form.Label>担当者</Form.Label>
             <Form.Control
               type="text"
               placeholder="担当者名を入力"
               value={completionData.technician}
               onChange={(e) => setCompletionData({
                 ...completionData,
                 technician: e.target.value
               })}
             />
           </Form.Group>
           <Form.Group className="mb-3">
             <Form.Label>備考</Form.Label>
             <Form.Control
               as="textarea"
               rows={3}
               placeholder="備考を入力"
               value={completionData.notes}
               onChange={(e) => setCompletionData({
                 ...completionData,
                 notes: e.target.value
               })}
             />
           </Form.Group>
         </Form>
       </Modal.Body>
       <Modal.Footer>
         <Button variant="secondary" onClick={() => setShowCompleteModal(false)}>
           キャンセル
         </Button>
         <Button variant="success" onClick={completeSchedule} disabled={loading}>
           {loading ? '処理中...' : '完了登録'}
         </Button>
       </Modal.Footer>
     </Modal>
   </Container>
 );
}
          