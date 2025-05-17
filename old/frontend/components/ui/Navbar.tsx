'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Navbar as BootstrapNavbar, Container, Nav } from 'react-bootstrap';

export default function Navbar() {
  const pathname = usePathname();
  
  return (
    <BootstrapNavbar bg="dark" variant="dark" expand="lg">
      <Container>
        <BootstrapNavbar.Brand as={Link} href="/">車両整備管理システム</BootstrapNavbar.Brand>
        <BootstrapNavbar.Toggle aria-controls="basic-navbar-nav" />
        <BootstrapNavbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link as={Link} href="/" active={pathname === '/'}>
              ダッシュボード
            </Nav.Link>
            <Nav.Link as={Link} href="/vehicles" active={pathname.startsWith('/vehicles')}>
              車両管理
            </Nav.Link>
            <Nav.Link as={Link} href="/maintenance" active={pathname.startsWith('/maintenance')}>
              整備記録
            </Nav.Link>
          </Nav>
        </BootstrapNavbar.Collapse>
      </Container>
    </BootstrapNavbar>
  );
}