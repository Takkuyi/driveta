// src/app/login/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';

const API_BASE_URL = 'http://127.0.0.1:5000/api';

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // 既にログイン済みかチェック
  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/status`, {
          method: 'GET',
          credentials: 'include', // セッションCookieを含める
        });
        
        if (response.ok) {
          // 既にログイン済みの場合はダッシュボードにリダイレクト
          router.replace('/');
        }
      } catch (error) {
        // ログインしていない場合は何もしない
        console.log('Not logged in yet');
      }
    };
    
    checkLoginStatus();
  }, [router]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // セッションCookieを含める
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        // ログイン成功
        console.log('Login successful:', data);
        
        // 認証状態を確認してからリダイレクト
        const statusResponse = await fetch(`${API_BASE_URL}/auth/status`, {
          method: 'GET',
          credentials: 'include',
        });
        
        if (statusResponse.ok) {
          // ダッシュボードにリダイレクト
          router.replace('/');
        } else {
          setError('認証状態の確認に失敗しました');
        }
      } else {
        // ログイン失敗
        setError(data.error || 'ログインに失敗しました');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('サーバーとの通信に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="min-vh-100 d-flex align-items-center justify-content-center">
      <Row className="w-100">
        <Col md={6} lg={4} className="mx-auto">
          <Card>
            <Card.Header className="text-center bg-primary text-white">
              <h4 className="mb-0">DRIVETA ログイン</h4>
            </Card.Header>
            <Card.Body>
              {error && (
                <Alert variant="danger" className="mb-3">
                  {error}
                </Alert>
              )}
              
              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>ユーザー名</Form.Label>
                  <Form.Control
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    required
                    autoComplete="username"
                  />
                </Form.Group>
                
                <Form.Group className="mb-3">
                  <Form.Label>パスワード</Form.Label>
                  <Form.Control
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    autoComplete="current-password"
                  />
                </Form.Group>
                
                <div className="d-grid">
                  <Button 
                    variant="primary" 
                    type="submit" 
                    disabled={loading}
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
                        ログイン中...
                      </>
                    ) : (
                      'ログイン'
                    )}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}