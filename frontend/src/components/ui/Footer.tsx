// src/components/ui/Footer.tsx
import { Container } from 'react-bootstrap';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="footer py-3 bg-light mt-auto">
      <Container>
        <span className="text-muted">© {currentYear} 車両整備管理システム</span>
      </Container>
    </footer>
  );
}