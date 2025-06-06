// src/components/TestAPI.js - テスト用コンポーネント
'use client';

import { useState } from 'react';
import { Button, Card, Alert } from 'react-bootstrap';

const API_BASE_URL = 'http://127.0.0.1:5000/api';

export default function TestAPI() {
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const testLogin = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          username: 'admin',
          password: 'admin123'
        })
      });

      const data = await response.json();
      setResult(`ログインテスト結果:\nStatus: ${response.status}\nResponse: ${JSON.stringify(data, null, 2)}`);
    } catch (error) {
      setResult(`エラー: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/status`, {
        method: 'GET',
        credentials: 'include',
      });

      const data = await response.json();
      setResult(`認証状態テスト結果:\nStatus: ${response.status}\nResponse: ${JSON.stringify(data, null, 2)}`);
    } catch (error) {
      setResult(`エラー: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testEndpoints = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/`, {
        method: 'GET',
      });

      const data = await response.json();
      setResult(`エンドポイント一覧:\nStatus: ${response.status}\nResponse: ${JSON.stringify(data, null, 2)}`);
    } catch (error) {
      setResult(`エラー: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mb-4">
      <Card.Header>
        <h5>API テスト</h5>
      </Card.Header>
      <Card.Body>
        <div className="d-flex gap-2 mb-3">
          <Button onClick={testEndpoints} disabled={loading} variant="info">
            エンドポイント確認
          </Button>
          <Button onClick={testLogin} disabled={loading} variant="primary">
            ログインテスト
          </Button>
          <Button onClick={testStatus} disabled={loading} variant="secondary">
            認証状態確認
          </Button>
        </div>
        
        {result && (
          <Alert variant="light">
            <pre>{result}</pre>
          </Alert>
        )}
      </Card.Body>
    </Card>
  );
}