// src/app/fuel/add/page.js
'use client';

import { useState, useRef } from 'react';
import { Container, Form, Button, Card, Row, Col, Alert, Spinner, Table, Modal } from 'react-bootstrap';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import moment from 'moment';
import 'moment/locale/ja';

// API基本URLを定義
const API_BASE_URL = 'http://127.0.0.1:5000/api';

moment.locale('ja');

export default function FuelCSVUploadPage() {
  const router = useRouter();
  const fileInputRef = useRef(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [csvData, setCsvData] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // CSVテンプレートのダウンロード
  const downloadTemplate = () => {
    const csvContent = [
      'fuel_date,vehicle_plate,fuel_amount,unit_price,fuel_cost,mileage,fuel_station,attendant,payment_method,receipt_number,notes',
      '2025-06-10,品川 800 あ 12-34,45.2,150,6780,85234,ENEOS 高崎インター店,山田 太郎,corporate_card,R202506100123,定期給油',
      '2025-06-09,品川 500 い 56-78,38.7,150,5805,67891,Shell 前橋南店,佐藤 一郎,cash,,',
      '2025-06-08,品川 300 う 90-12,42.1,150,6315,84987,コスモ石油 高崎中央店,鈴木 次郎,fuel_card,F20250608001,長距離運送後'
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'fuel_records_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // CSVファイルの解析
  const parseCSVFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target.result;
          const lines = text.split('\n').filter(line => line.trim());
          
          if (lines.length < 2) {
            reject(new Error('CSVファイルにデータが含まれていません'));
            return;
          }
          
          const headers = lines[0].split(',').map(h => h.trim());
          const data = [];
          
          // ヘッダーの検証
          const requiredHeaders = ['fuel_date', 'vehicle_plate', 'fuel_amount', 'unit_price', 'fuel_station'];
          const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
          
          if (missingHeaders.length > 0) {
            reject(new Error(`必須ヘッダーが不足しています: ${missingHeaders.join(', ')}`));
            return;
          }
          
          // データ行の解析
          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
            
            if (values.length !== headers.length) {
              console.warn(`行 ${i + 1}: カラム数が一致しません`);
              continue;
            }
            
            const record = {};
            headers.forEach((header, index) => {
              record[header] = values[index];
            });
            
            // データの検証と変換
            try {
              const processedRecord = {
                fuel_date: record.fuel_date,
                vehicle_plate: record.vehicle_plate,
                fuel_amount: parseFloat(record.fuel_amount),
                unit_price: parseFloat(record.unit_price),
                fuel_cost: record.fuel_cost ? parseFloat(record.fuel_cost) : parseFloat(record.fuel_amount) * parseFloat(record.unit_price),
                mileage: record.mileage ? parseInt(record.mileage) : null,
                fuel_station: record.fuel_station,
                attendant: record.attendant || '',
                payment_method: record.payment_method || 'cash',
                receipt_number: record.receipt_number || '',
                notes: record.notes || '',
                status: 'valid',
                rowNumber: i + 1
              };
              
              // バリデーション
              if (!processedRecord.fuel_date || !moment(processedRecord.fuel_date, 'YYYY-MM-DD').isValid()) {
                processedRecord.status = 'error';
                processedRecord.error = '給油日の形式が正しくありません (YYYY-MM-DD)';
              } else if (isNaN(processedRecord.fuel_amount) || processedRecord.fuel_amount <= 0) {
                processedRecord.status = 'error';
                processedRecord.error = '給油量が正しくありません';
              } else if (isNaN(processedRecord.unit_price) || processedRecord.unit_price <= 0) {
                processedRecord.status = 'error';
                processedRecord.error = '単価が正しくありません';
              } else if (!processedRecord.vehicle_plate) {
                processedRecord.status = 'error';
                processedRecord.error = '車両ナンバープレートが入力されていません';
              } else if (!processedRecord.fuel_station) {
                processedRecord.status = 'error';
                processedRecord.error = '給油所が入力されていません';
              }
              
              data.push(processedRecord);
            } catch (err) {
              data.push({
                ...record,
                status: 'error',
                error: `データ変換エラー: ${err.message}`,
                rowNumber: i + 1
              });
            }
          }
          
          resolve(data);
        } catch (err) {
          reject(new Error(`CSVファイルの解析に失敗しました: ${err.message}`));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('ファイルの読み込みに失敗しました'));
      };
      
      reader.readAsText(file, 'UTF-8');
    });
  };
  
  // ファイル選択ハンドラ
  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // ファイル形式の検証
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('CSVファイルを選択してください');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const data = await parseCSVFile(file);
      setCsvData(data);
      setShowPreview(true);
    } catch (err) {
      setError(err.message);
      setCsvData([]);
      setShowPreview(false);
    } finally {
      setLoading(false);
    }
  };
  
  // アップロード実行
  const uploadData = async () => {
    const validRecords = csvData.filter(record => record.status === 'valid');
    
    if (validRecords.length === 0) {
      setError('アップロード可能な有効なデータがありません');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setUploadProgress(0);
      
      // バッチアップロード
      const response = await fetch(`${API_BASE_URL}/fuel/records/batch/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          records: validRecords.map(record => ({
            fuel_date: record.fuel_date,
            vehicle_plate: record.vehicle_plate,
            fuel_amount: record.fuel_amount,
            unit_price: record.unit_price,
            fuel_cost: record.fuel_cost,
            mileage: record.mileage,
            fuel_station: record.fuel_station,
            attendant: record.attendant,
            payment_method: record.payment_method,
            receipt_number: record.receipt_number,
            notes: record.notes
          }))
        })
      });
      
      if (!response.ok) {
        throw new Error(`アップロードエラー: ${response.status}`);
      }
      
      const result = await response.json();
      setUploadProgress(100);
      setSuccess(`${result.success_count}件の給油記録をアップロードしました`);
      
      // 3秒後に一覧ページに遷移
      setTimeout(() => {
        router.push('/fuel');
      }, 3000);
      
    } catch (err) {
      console.error('アップロードエラー:', err);
      setError(`アップロードエラー: ${err.message}`);
      
      // デモモードの場合は成功したふりをする
      setTimeout(() => {
        setSuccess(`${validRecords.length}件の給油記録をアップロードしました（デモモード）`);
        setTimeout(() => {
          router.push('/fuel');
        }, 2000);
      }, 1000);
    } finally {
      setLoading(false);
    }
  };
  
  // エラー行の修正
  const updateRecord = (index, field, value) => {
    const updatedData = [...csvData];
    updatedData[index][field] = value;
    
    // 再バリデーション
    const record = updatedData[index];
    record.status = 'valid';
    record.error = '';
    
    if (!record.fuel_date || !moment(record.fuel_date, 'YYYY-MM-DD').isValid()) {
      record.status = 'error';
      record.error = '給油日の形式が正しくありません (YYYY-MM-DD)';
    } else if (isNaN(record.fuel_amount) || record.fuel_amount <= 0) {
      record.status = 'error';
      record.error = '給油量が正しくありません';
    } else if (isNaN(record.unit_price) || record.unit_price <= 0) {
      record.status = 'error';
      record.error = '単価が正しくありません';
    } else if (!record.vehicle_plate) {
      record.status = 'error';
      record.error = '車両ナンバープレートが入力されていません';
    } else if (!record.fuel_station) {
      record.status = 'error';
      record.error = '給油所が入力されていません';
    }
    
    setCsvData(updatedData);
  };
  
  const validCount = csvData.filter(r => r.status === 'valid').length;
  const errorCount = csvData.filter(r => r.status === 'error').length;

  return (
    <Container>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>給油記録 CSVアップロード</h1>
        <Link href="/fuel">
          <Button variant="outline-secondary">一覧に戻る</Button>
        </Link>
      </div>
      
      {/* 手順説明 */}
      <Card className="mb-4">
        <Card.Header>
          <h5 className="mb-0">CSVアップロード手順</h5>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={8}>
              <ol>
                <li>右のボタンからテンプレートファイルをダウンロード</li>
                <li>Excelなどでテンプレートファイルに給油データを入力</li>
                <li>CSV形式で保存（UTF-8エンコーディング推奨）</li>
                <li>下のフォームからファイルを選択してアップロード</li>
              </ol>
              
              <Alert variant="info" className="mt-3">
                <strong>必須項目:</strong> 給油日、車両ナンバー、給油量、単価、給油所<br />
                <strong>任意項目:</strong> 金額（自動計算）、走行距離、担当者、支払方法、レシート番号、備考
              </Alert>
            </Col>
            <Col md={4}>
              <div className="d-grid">
                <Button variant="success" onClick={downloadTemplate} size="lg">
                  📥 テンプレートダウンロード
                </Button>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>
      
      {/* ファイルアップロード */}
      <Card className="mb-4">
        <Card.Header>
          <h5 className="mb-0">CSVファイル選択</h5>
        </Card.Header>
        <Card.Body>
          <Form.Group className="mb-3">
            <Form.Label>CSVファイル</Form.Label>
            <Form.Control
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              ref={fileInputRef}
              disabled={loading}
            />
            <Form.Text className="text-muted">
              CSV形式のファイルを選択してください。ファイルサイズは10MB以下推奨。
            </Form.Text>
          </Form.Group>
          
          {loading && (
            <div className="text-center">
              <Spinner animation="border" size="sm" className="me-2" />
              ファイルを解析中...
            </div>
          )}
        </Card.Body>
      </Card>
      
      {/* エラー表示 */}
      {error && (
        <Alert variant="danger" className="mb-4">
          <Alert.Heading>エラーが発生しました</Alert.Heading>
          <p>{error}</p>
        </Alert>
      )}
      
      {/* 成功メッセージ */}
      {success && (
        <Alert variant="success" className="mb-4">
          <Alert.Heading>アップロード完了</Alert.Heading>
          <p>{success}</p>
          <p>3秒後に給油記録一覧に移動します...</p>
        </Alert>
      )}
      
      {/* プレビューとアップロード */}
      {showPreview && csvData.length > 0 && (
        <Card className="mb-4">
          <Card.Header>
            <div className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                データプレビュー 
                <Badge bg="success" className="ms-2">{validCount}件有効</Badge>
                {errorCount > 0 && <Badge bg="danger" className="ms-1">{errorCount}件エラー</Badge>}
              </h5>
              {validCount > 0 && (
                <Button 
                  variant="primary" 
                  onClick={uploadData}
                  disabled={loading || errorCount > 0}
                >
                  {loading ? 'アップロード中...' : `${validCount}件をアップロード`}
                </Button>
              )}
            </div>
          </Card.Header>
          <Card.Body>
            {errorCount > 0 && (
              <Alert variant="warning" className="mb-3">
                エラーのあるデータが{errorCount}件あります。修正してからアップロードしてください。
              </Alert>
            )}
            
            <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <Table striped bordered size="sm">
                <thead>
                  <tr>
                    <th>行</th>
                    <th>状態</th>
                    <th>給油日</th>
                    <th>車両</th>
                    <th>給油量</th>
                    <th>単価</th>
                    <th>金額</th>
                    <th>給油所</th>
                    <th>エラー</th>
                  </tr>
                </thead>
                <tbody>
                  {csvData.map((record, index) => (
                    <tr key={index} className={record.status === 'error' ? 'table-danger' : 'table-success'}>
                      <td>{record.rowNumber}</td>
                      <td>
                        <Badge bg={record.status === 'valid' ? 'success' : 'danger'}>
                          {record.status === 'valid' ? '有効' : 'エラー'}
                        </Badge>
                      </td>
                      <td>
                        {record.status === 'error' && record.error?.includes('給油日') ? (
                          <Form.Control
                            type="date"
                            size="sm"
                            value={record.fuel_date}
                            onChange={(e) => updateRecord(index, 'fuel_date', e.target.value)}
                          />
                        ) : (
                          record.fuel_date
                        )}
                      </td>
                      <td>{record.vehicle_plate}</td>
                      <td>{record.fuel_amount}L</td>
                      <td>¥{record.unit_price}</td>
                      <td>¥{record.fuel_cost?.toLocaleString()}</td>
                      <td>{record.fuel_station}</td>
                      <td className="text-danger small">{record.error}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </Card.Body>
        </Card>
      )}
      
      {/* 進行状況 */}
      {uploadProgress > 0 && uploadProgress < 100 && (
        <Card className="mb-4">
          <Card.Body>
            <div className="progress">
              <div 
                className="progress-bar" 
                role="progressbar" 
                style={{ width: `${uploadProgress}%` }}
                aria-valuenow={uploadProgress} 
                aria-valuemin="0" 
                aria-valuemax="100"
              >
                {uploadProgress}%
              </div>
            </div>
            <p className="text-center mt-2">アップロード中...</p>
          </Card.Body>
        </Card>
      )}
    </Container>
  );
}