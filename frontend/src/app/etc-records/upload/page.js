// frontend/src/app/etc-records/upload/page.js
'use client';

import { useState } from 'react';
import { Container, Card, Form, Button, Alert, Spinner, ProgressBar, Table } from 'react-bootstrap';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// API基本URLを定義
const API_BASE_URL = 'http://127.0.0.1:5000/api';

export default function ETCUploadPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState(null);

  // ファイル選択ハンドラ
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    setSelectedFile(file);
    setError(null);
    setSuccess(null);
    setUploadResult(null);
    
    // ファイル検証
    if (file) {
      if (!file.name.endsWith('.csv')) {
        setError('CSVファイルを選択してください。');
        setSelectedFile(null);
        return;
      }
      
      if (file.size > 10 * 1024 * 1024) { // 10MB制限
        setError('ファイルサイズが大きすぎます。10MB以下のファイルを選択してください。');
        setSelectedFile(null);
        return;
      }
    }
  };

  // ファイルアップロード実行
  const handleUpload = async () => {
    if (!selectedFile) {
      setError('ファイルを選択してください。');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setUploadProgress(0);

      const formData = new FormData();
      formData.append('file', selectedFile);

      // アップロード進行状況をシミュレート
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const response = await fetch(`${API_BASE_URL}/etc/upload`, {
        method: 'POST',
        body: formData
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `アップロードエラー: ${response.status}`);
      }

      const result = await response.json();
      setUploadResult(result);
      setSuccess(`CSVファイルのアップロードが完了しました。${result.imported_count}件のデータを取り込みました。`);
      
      // 成功後に少し待ってから一覧ページに遷移するかユーザーに選択させる
      
    } catch (err) {
      console.error('アップロードエラー:', err);
      setError(`アップロードに失敗しました: ${err.message}`);
      setUploadProgress(0);
    } finally {
      setLoading(false);
    }
  };

  // ファイルクリア
  const handleClearFile = () => {
    setSelectedFile(null);
    setError(null);
    setSuccess(null);
    setUploadResult(null);
    setUploadProgress(0);
    
    // ファイル入力をクリア
    const fileInput = document.getElementById('csvFile');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  return (
    <Container>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>ETCデータ CSVアップロード</h1>
        <Link href="/etc-records">
          <Button variant="outline-secondary">一覧に戻る</Button>
        </Link>
      </div>

      {/* アップロード説明 */}
      <Card className="mb-4">
        <Card.Header className="bg-info text-white">
          <h5 className="mb-0">📋 アップロード手順</h5>
        </Card.Header>
        <Card.Body>
          <ol className="mb-0">
            <li>ETCカード会社から提供されるCSVファイルを準備してください</li>
            <li>CSVファイルには以下の列が含まれている必要があります：
              <ul className="mt-2">
                <li>利用年月日（自）</li>
                <li>時分（自）</li>
                <li>利用年月日（至）</li>
                <li>時分（至）</li>
                <li>利用ＩＣ（自）</li>
                <li>利用ＩＣ（至）</li>
                <li>割引前料金</li>
                <li>ＥＴＣ割引額</li>
                <li>通行料金</li>
                <li>車両番号</li>
                <li>ＥＴＣカード番号</li>
                <li>備考（任意）</li>
              </ul>
            </li>
            <li>ファイルサイズは10MB以下にしてください</li>
            <li>「ファイルを選択」ボタンからCSVファイルを選択し、「アップロード」を実行してください</li>
          </ol>
        </Card.Body>
      </Card>

      {/* ファイルアップロードフォーム */}
      <Card>
        <Card.Header>
          <h5 className="mb-0">CSVファイルアップロード</h5>
        </Card.Header>
        <Card.Body>
          {error && (
            <Alert variant="danger" className="mb-4">
              <Alert.Heading>エラー</Alert.Heading>
              {error}
            </Alert>
          )}

          {success && (
            <Alert variant="success" className="mb-4">
              <Alert.Heading>アップロード完了</Alert.Heading>
              {success}
              <hr />
              <div className="d-flex gap-2">
                <Link href="/etc-records">
                  <Button variant="success">ETC記録一覧を見る</Button>
                </Link>
                <Button variant="outline-success" onClick={handleClearFile}>
                  続けてアップロード
                </Button>
              </div>
            </Alert>
          )}

          <Form>
            <Form.Group className="mb-4">
              <Form.Label>CSVファイル</Form.Label>
              <Form.Control
                id="csvFile"
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                disabled={loading}
              />
              <Form.Text className="text-muted">
                CSVファイル（最大10MB）を選択してください
              </Form.Text>
            </Form.Group>

            {selectedFile && (
              <Card className="mb-4 border-light bg-light">
                <Card.Body>
                  <h6>選択されたファイル</h6>
                  <Table borderless size="sm">
                    <tbody>
                      <tr>
                        <td><strong>ファイル名:</strong></td>
                        <td>{selectedFile.name}</td>
                      </tr>
                      <tr>
                        <td><strong>ファイルサイズ:</strong></td>
                        <td>{(selectedFile.size / 1024).toFixed(1)} KB</td>
                      </tr>
                      <tr>
                        <td><strong>最終更新:</strong></td>
                        <td>{new Date(selectedFile.lastModified).toLocaleString('ja-JP')}</td>
                      </tr>
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            )}

            {loading && (
              <div className="mb-4">
                <div className="d-flex justify-content-between mb-2">
                  <span>アップロード中...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <ProgressBar now={uploadProgress} animated />
              </div>
            )}

            <div className="d-flex gap-2">
              <Button
                variant="primary"
                onClick={handleUpload}
                disabled={!selectedFile || loading}
              >
                {loading ? (
                  <>
                    <Spinner
                      as="span"
                      animation="border"
                      size="sm"
                      role="status"
                      aria-hidden="true"
                      className="me-2"
                    />
                    アップロード中...
                  </>
                ) : (
                  'アップロード実行'
                )}
              </Button>

              {selectedFile && !loading && (
                <Button variant="outline-secondary" onClick={handleClearFile}>
                  ファイルクリア
                </Button>
              )}
            </div>
          </Form>
        </Card.Body>
      </Card>

      {/* アップロード結果詳細 */}
      {uploadResult && (
        <Card className="mt-4">
          <Card.Header className="bg-success text-white">
            <h5 className="mb-0">📊 アップロード結果</h5>
          </Card.Header>
          <Card.Body>
            <Table bordered>
              <tbody>
                <tr>
                  <td><strong>取り込み成功件数</strong></td>
                  <td className="text-success fw-bold">{uploadResult.imported_count}件</td>
                </tr>
                <tr>
                  <td><strong>エラー件数</strong></td>
                  <td className={uploadResult.error_count > 0 ? 'text-warning fw-bold' : 'text-muted'}>
                    {uploadResult.error_count}件
                  </td>
                </tr>
              </tbody>
            </Table>

            {uploadResult.errors && uploadResult.errors.length > 0 && (
              <div className="mt-3">
                <h6 className="text-warning">⚠️ エラー詳細</h6>
                <Alert variant="warning">
                  <ul className="mb-0">
                    {uploadResult.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                  {uploadResult.error_count > uploadResult.errors.length && (
                    <p className="mt-2 mb-0">
                      <small>他 {uploadResult.error_count - uploadResult.errors.length} 件のエラーがあります</small>
                    </p>
                  )}
                </Alert>
              </div>
            )}
          </Card.Body>
        </Card>
      )}

      {/* サンプルCSVフォーマット */}
      <Card className="mt-4">
        <Card.Header>
          <h5 className="mb-0">📝 CSVフォーマット例</h5>
        </Card.Header>
        <Card.Body>
          <pre className="bg-light p-3 rounded">
{`利用年月日（自）,時分（自）,利用年月日（至）,時分（至）,利用ＩＣ（自）,利用ＩＣ（至）,割引前料金,ＥＴＣ割引額,通行料金,車両番号,ＥＴＣカード番号,備考
2025/01/15,09:30,2025/01/15,10:45,高崎IC,前橋IC,800,80,720,TRK-001,1234567890123456,定期配送
2025/01/15,14:20,2025/01/15,15:10,前橋IC,伊勢崎IC,600,60,540,TRK-001,1234567890123456,
2025/01/16,08:15,2025/01/16,09:30,,日光本線料金所,1200,120,1080,TRK-002,2345678901234567,日光本線料金所（自は空）`}
          </pre>
          <small className="text-muted">
            ※ 実際のETCカード会社提供のCSVファイルに合わせて列名を調整してください
          </small>
        </Card.Body>
      </Card>
    </Container>
  );
}