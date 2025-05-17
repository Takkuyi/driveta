"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Form, Button, Card, Alert, Container, Spinner } from "react-bootstrap";
import { authApi } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    // セッションが既に存在するか確認
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem("token");
        if (token) {
          const result = await authApi.checkAuth();
          if (result.message === "ログイン中") {
            router.push("/");
          } else {
            setCheckingAuth(false);
          }
        } else {
          setCheckingAuth(false);
        }
      } catch (err) {
        localStorage.removeItem("token");
        setCheckingAuth(false);
      }
    };

    checkAuth();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await authApi.login(username, password);
      localStorage.setItem("token", result.token);
      router.push("/");
    } catch (err: any) {
      console.error("Login error:", err);
      setError(
        err.response?.data?.error || 
        err.response?.data?.message || 
        "ログインに失敗しました。ユーザー名とパスワードを確認してください。"
      );
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">読み込み中...</span>
        </Spinner>
      </div>
    );
  }

  return (
    <Container className="d-flex justify-content-center align-items-center min-vh-100">
      <Card className="shadow-sm" style={{ width: "100%", maxWidth: "400px" }}>
        <Card.Header className="bg-primary text-white text-center py-3">
          <h2 className="mb-0">車両管理システム</h2>
        </Card.Header>
        <Card.Body className="p-4">
          <h4 className="text-center mb-4">ログイン</h4>
          
          {error && <Alert variant="danger">{error}</Alert>}
          
          <Form onSubmit={handleLogin}>
            <Form.Group className="mb-3" controlId="username">
              <Form.Label>ユーザー名</Form.Label>
              <Form.Control
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ユーザー名を入力"
                autoComplete="username"
                required
              />
            </Form.Group>

            <Form.Group className="mb-4" controlId="password">
              <Form.Label>パスワード</Form.Label>
              <Form.Control
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="パスワードを入力"
                autoComplete="current-password"
                required
              />
            </Form.Group>

            <div className="d-grid">
              <Button
                variant="primary"
                type="submit"
                className="py-2"
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
                  "ログイン"
                )}
              </Button>
            </div>
          </Form>
        </Card.Body>
        <Card.Footer className="text-center text-muted py-3">
          © {new Date().getFullYear()} 株式会社関東隆商運輸
        </Card.Footer>
      </Card>
    </Container>
  );
}