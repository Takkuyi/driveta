'use client';

import './globals.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';

export default function RootLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const pathname = usePathname();

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const menuItems = [
    { icon: '📊', title: 'ダッシュボード', path: '/' },
    { icon: '🚚', title: '車両管理', path: '/vehicles' },
    { icon: '🔧', title: '整備記録', path: '/maintenance' },
    { icon: '📝', title: '配送スケジュール', path: '/schedule' },
    { icon: '💰', title: 'ETC記録', path: '/etc-records' }
  ];

  return (
    <html lang="ja">
      <body>
        <div className="d-flex">
          {/* サイドバー */}
          <div className={`sidebar bg-dark text-white ${sidebarOpen ? 'open' : 'closed'}`} 
               style={{ 
                 width: sidebarOpen ? '250px' : '60px', 
                 transition: 'width 0.3s',
                 position: 'fixed',
                 height: '100vh',
                 zIndex: 100
               }}>
            <div className="d-flex justify-content-between align-items-center p-3 border-bottom">
              <div className="d-flex align-items-center">
                {/* ロゴマーク（シンボル部分） */}
                <div style={{ width: '40px', height: '40px', position: 'relative' }}>
                  <Image 
                    src="/driveta-symbol.png" 
                    alt="DRIVETA Symbol" 
                    width={40} 
                    height={40} 
                    style={{ objectFit: 'contain' }}
                  />
                </div>
                
                {/* システム名（ワードマーク部分） - サイドバーが開いているときだけ表示 */}
                {sidebarOpen && (
                  <div className="ms-2" style={{ height: '30px', position: 'relative' }}>
                    <Image 
                      src="/driveta-wordmark.png" 
                      alt="DRIVETA" 
                      width={120} 
                      height={30} 
                      style={{ objectFit: 'contain' }}
                    />
                  </div>
                )}
              </div>
              <button className="btn btn-sm btn-dark" onClick={toggleSidebar}>
                {sidebarOpen ? '◀' : '▶'}
              </button>
            </div>
            <ul className="nav flex-column p-2">
              {menuItems.map((item, index) => (
                <li className="nav-item mb-2" key={index}>
                  <Link href={item.path} 
                        className={`nav-link ${pathname === item.path ? 'active bg-secondary rounded' : 'text-white'}`}>
                    <span className="me-2">{item.icon}</span>
                    {sidebarOpen && <span>{item.title}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* メインコンテンツ */}
          <div style={{ 
            marginLeft: sidebarOpen ? '250px' : '60px', 
            width: '100%',
            transition: 'margin-left 0.3s',
            padding: '20px'
          }}>
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}