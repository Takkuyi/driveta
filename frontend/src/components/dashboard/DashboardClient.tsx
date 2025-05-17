// components/dashboard/DashboardClient.tsx
'use client';

import { Row, Col, Card } from 'react-bootstrap';
import BirthdayCard from '@/components/dashboard/BirthdayCard';

export default function DashboardClient() {
  return (
    <div>
      <h1 className="mb-4">ダッシュボード</h1>
      
      <Row className="mb-4">
        <Col md={3}>
          <Card className="border-primary mb-3 h-100">
            <Card.Body>
              <div className="d-flex justify-content-between">
                <div>
                  <Card.Title className="text-muted">車両総数</Card.Title>
                  <Card.Text className="fs-2 fw-bold">24</Card.Text>
                </div>
                <div className="fs-1 text-muted">🚚</div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={3}>
          <Card className="border-success mb-3 h-100">
            <Card.Body>
              <div className="d-flex justify-content-between">
                <div>
                  <Card.Title className="text-muted">運行中車両</Card.Title>
                  <Card.Text className="fs-2 fw-bold">18</Card.Text>
                </div>
                <div className="fs-1 text-muted">🟢</div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={3}>
          <Card className="border-warning mb-3 h-100">
            <Card.Body>
              <div className="d-flex justify-content-between">
                <div>
                  <Card.Title className="text-muted">整備中車両</Card.Title>
                  <Card.Text className="fs-2 fw-bold">3</Card.Text>
                </div>
                <div className="fs-1 text-muted">🔧</div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={3}>
          <Card className="border-danger mb-3 h-100">
            <Card.Body>
              <div className="d-flex justify-content-between">
                <div>
                  <Card.Title className="text-muted">未対応アラート</Card.Title>
                  <Card.Text className="fs-2 fw-bold">5</Card.Text>
                </div>
                <div className="fs-1 text-muted">⚠️</div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      <Row className="mb-4">
        <Col md={8}>
          <Card className="mb-3 h-100">
            <Card.Header>整備アラート</Card.Header>
            <Card.Body>
              <div className="alert alert-warning">
                <h5 className="alert-heading">定期点検の期限が近づいています</h5>
                <p className="mb-0">車両番号: TRK-001（高崎 830 あ 3035）- 残り5日</p>
              </div>
              
              <div className="alert alert-warning">
                <h5 className="alert-heading">エンジンオイル交換が必要です</h5>
                <p className="mb-0">車両番号: TRK-003（高崎 830 あ 1055）- 走行距離: 8,500km</p>
              </div>
              
              <div className="alert alert-danger">
                <h5 className="alert-heading">車検期限が切れています</h5>
                <p className="mb-0">車両番号: TRK-007（高崎 100 あ 1234）- 期限切れ: 2日前</p>
              </div>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={4}>
          <BirthdayCard />
        </Col>
      </Row>
      
      <Row>
        <Col md={12}>
          <Card>
            <Card.Header>今週の配送スケジュール</Card.Header>
            <Card.Body>
              <div className="table-responsive">
                <table className="table table-striped table-hover">
                  <thead>
                    <tr>
                      <th>日付</th>
                      <th>コース</th>
                      <th>車両</th>
                      <th>ドライバー</th>
                      <th>状態</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>2025-04-14 (月)</td>
                      <td>前橋ルート</td>
                      <td>TRK-001</td>
                      <td>山田 太郎</td>
                      <td><span className="badge bg-success">完了</span></td>
                    </tr>
                    <tr>
                      <td>2025-04-15 (火)</td>
                      <td>高崎市内</td>
                      <td>TRK-003</td>
                      <td>佐藤 一郎</td>
                      <td><span className="badge bg-warning text-dark">準備中</span></td>
                    </tr>
                    <tr>
                      <td>2025-04-16 (水)</td>
                      <td>伊勢崎ルート</td>
                      <td>TRK-005</td>
                      <td>鈴木 次郎</td>
                      <td><span className="badge bg-secondary">予定</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
}