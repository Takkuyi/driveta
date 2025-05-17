'use client';

import { useEffect, useState } from 'react';
import { Card } from 'react-bootstrap';
import axios from 'axios';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  color: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info';
  endpoint: string;
}

export default function StatCard({ title, value: initialValue, icon, color, endpoint }: StatCardProps) {
  const [value, setValue] = useState<string | number>(initialValue);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 本番環境ではこのAPIエンドポイントを実装する必要があります
        const response = await axios.get(endpoint);
        setValue(response.data.value);
      } catch (error) {
        console.error(`Error fetching data from ${endpoint}:`, error);
        // デモ用のダミーデータ
        const dummyValues: Record<string, number> = {
          '/api/stats/vehicles/count': 24,
          '/api/stats/vehicles/maintenance': 3,
          '/api/stats/maintenance/month': 12,
          '/api/stats/alerts/pending': 5
        };
        setValue(dummyValues[endpoint] || '0');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [endpoint]);

  return (
    <Card className={`border-${color} mb-3 h-100`}>
      <Card.Body>
        <div className="d-flex justify-content-between">
          <div>
            <Card.Title className="text-muted">{title}</Card.Title>
            <Card.Text className="fs-2 fw-bold">
              {loading ? '...' : value}
            </Card.Text>
          </div>
          <div className="fs-1 text-muted">
            {icon}
          </div>
        </div>
      </Card.Body>
    </Card>
  );
}