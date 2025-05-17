// components/dashboard/BirthdayCard.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, ListGroup, Spinner, Alert } from 'react-bootstrap';

interface Employee {
  年齢: number;
  氏名: string;
  生年月日: string;
}

export default function BirthdayCard() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUsingDummyData, setIsUsingDummyData] = useState(false);
  
  useEffect(() => {
    const fetchBirthdays = async () => {
      try {
        const response = await fetch('http://127.0.0.1:5000/api/employees/birthday_soon');
        if (!response.ok) {
          throw new Error(`APIエラー: ${response.status}`);
        }
        const data = await response.json();
        setEmployees(data);
        setLoading(false);
        setIsUsingDummyData(false);
      } catch (err) {
        console.error('Error fetching birthday data:', err);
        setError('誕生日データの取得中にエラーが発生しました');
        setLoading(false);
        setIsUsingDummyData(true);
        
        // デモ用のダミーデータ
        setEmployees([
          {
            "年齢": 44,
            "氏名": "福島 佑樹",
            "生年月日": "1981-04-14"
          },
          {
            "年齢": 68,
            "氏名": "下田 賢治",
            "生年月日": "1957-04-09"
          },
          {
            "年齢": 55,
            "氏名": "赤井 和子",
            "生年月日": "1969-04-15"
          }
        ]);
      }
    };
    
    fetchBirthdays();
  }, []);
  
  // 日付をフォーマットする関数
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  };
  
  // 今日の日付
  const today = new Date();
  
  // 誕生日が今日かどうかをチェック
  const isBirthdayToday = (dateString: string) => {
    const birthDate = new Date(dateString);
    return birthDate.getMonth() === today.getMonth() && 
           birthDate.getDate() === today.getDate();
  };

  if (loading) {
    return (
      <Card className="h-100 border-info">
        <Card.Header className="bg-info text-white">
          <div className="d-flex justify-content-between align-items-center">
            <span>近日中の誕生日</span>
            <span>🎂</span>
          </div>
        </Card.Header>
        <Card.Body className="text-center py-4">
          <Spinner animation="border" role="status" variant="info">
            <span className="visually-hidden">読み込み中...</span>
          </Spinner>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="h-100 border-info">
      <Card.Header className="bg-info text-white">
        <div className="d-flex justify-content-between align-items-center">
          <span>近日中の誕生日</span>
          <span>🎂</span>
        </div>
      </Card.Header>
      
      {error && (
        <Alert variant="danger" className="m-2 mb-0">
          {error}
        </Alert>
      )}
      
      {isUsingDummyData && (
        <Alert variant="warning" className="m-2 mb-0">
          デモ用のダミーデータが表示されています
        </Alert>
      )}
      
      {employees.length === 0 ? (
        <Card.Body className="text-center py-4">
          <p className="mb-0">近日中の誕生日はありません</p>
        </Card.Body>
      ) : (
        <ListGroup variant="flush">
          {employees.map((employee, index) => (
            <ListGroup.Item 
              key={index} 
              className={isBirthdayToday(employee.生年月日) ? "bg-light" : ""}
            >
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="fw-bold">{employee.氏名}</div>
                  <div className="text-muted small">{formatDate(employee.生年月日)} ({employee.年齢}歳)</div>
                </div>
                {isBirthdayToday(employee.生年月日) && (
                  <span className="text-info">本日</span>
                )}
              </div>
            </ListGroup.Item>
          ))}
        </ListGroup>
      )}
    </Card>
  );
}