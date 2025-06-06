// frontend/src/app/login/page.js (API接続デバッグ版)
'use client';

import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');
  const [apiStatus, setApiStatus] = useState('確認中...');
  const { login } = useAuth();
  const router = useRouter();

  // バックエンドAPI接続確認
  useEffect(() => {
    const checkAPIConnection = async () => {
      try {
        const response = await fetch('http://127.0.0.1:5000/', {
          method: 'GET',
        });
        
        if (response.ok) {
          const data = await response.json();
          setApiStatus(`✅ API接続正常: ${data.message}`);
        } else {
          setApiStatus(`❌ API応答エラー: ${response.status}`);
        }
      } catch (err) {
        setApiStatus(`❌ API接続失敗: ${err.message}`);
      }
    };

    checkAPIConnection();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setDebugInfo('');
    setLoading(true);

    try {
      setDebugInfo('ステップ1: ログイン試行開始...');
      
      const apiUrl = 'http://127.0.0.1:5000/api/auth/login';
      setDebugInfo(`ステップ2: ${apiUrl} にリクエスト送信...`);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });

      setDebugInfo(`ステップ3: レスポンス受信 (状態: ${response.status})`);
      
      if (response.ok) {
        const data = await response.json();
        setDebugInfo(`ステップ4: ログイン成功 - ${JSON.stringify(data)}`);
        
        // 成功時の処理
        setTimeout(() => {
          router.push('/');
        }, 2000);
      } else {
        const errorData = await response.json();
        setError(`ログイン失敗: ${errorData.error || '認証エラー'}`);
        setDebugInfo(`エラー詳細: ${JSON.stringify(errorData)}`);
      }
    } catch (err) {
      console.error('接続エラー:', err);
      setError(`接続エラー: バックエンドサーバーに接続できません`);
      setDebugInfo(`詳細: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container fluid className="login-container" style={{ height: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <Row className="justify-content-center align-items-center h-100">
        <Col md={6} lg={5}>
          <Card className="shadow-lg border-0">
            <Card.Body className="p-5">
              <div className="text-center mb-4">
                <h4 className="text-muted">DRIVETA ログイン</h4>
                <small className="text-muted">運送業務管理システム</small>
              </div>

              {/* API接続状況 */}
              <Alert variant={apiStatus.includes('✅') ? 'success' : 'warning'}>
                <small><strong>API接続状況:</strong> {apiStatus}</small>
              </Alert>

              {error && <Alert variant="danger">{error}</Alert>}
              {debugInfo && <Alert variant="info"><small><strong>デバッグ:</strong> {debugInfo}</small></Alert>}

              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>ユーザー名</Form.Label>
                  <Form.Control
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    placeholder="ユーザー名を入力"
                  />
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label>パスワード</Form.Label>
                  <Form.Control
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="パスワードを入力"
                  />
                </Form.Group>

                <div className="d-grid">
                  <Button 
                    variant="primary" 
                    type="submit" 
                    disabled={loading || !apiStatus.includes('✅')}
                    size="lg"
                  >
                    {loading ? 'ログイン中...' : 'ログイン'}
                  </Button>
                </div>
              </Form>

              <div className="mt-3">
                <small className="text-muted">
                  テスト用: admin / admin123
                </small>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}