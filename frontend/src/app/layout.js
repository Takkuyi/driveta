// src/app/layout.js の修正
'use client';

import './globals.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

const API_BASE_URL = 'http://127.0.0.1:5000/api';

export default function RootLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedSubmenus, setExpandedSubmenus] = useState({
    vehicles: false
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  // 認証状態をチェック
  useEffect(() => {
    const checkAuth = async () => {
      // ログインページの場合は認証チェックをスキップ
      if (pathname === '/login') {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/auth/status`, {
          method: 'GET',
          credentials: 'include',
        });

        if (response.ok) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
          // 認証されていない場合はログインページにリダイレクト
          router.replace('/login');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setIsAuthenticated(false);
        router.replace('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [pathname, router]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const toggleSubmenu = (key) => {
    setExpandedSubmenus({
      ...expandedSubmenus,
      [key]: !expandedSubmenus[key]
    });
  };

  const handleLogout = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        setIsAuthenticated(false);
        router.replace('/login');
      }
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // ローディング中
  if (loading) {
    return (
      <html lang="ja">
        <body>
          <div className="d-flex justify-content-center align-items-center min-vh-100">
            <div className="text-center">
              <div className="spinner-border" role="status">
                <span className="visually-hidden">読み込み中...</span>
              </div>
              <p className="mt-2">認証状態を確認中...</p>
            </div>
          </div>
        </body>
      </html>
    );
  }

  // ログインページの場合は認証不要
  if (pathname === '/login') {
    return (
      <html lang="ja">
        <body>{children}</body>
      </html>
    );
  }

  // 認証されていない場合は何も表示しない（リダイレクト処理中）
  if (!isAuthenticated) {
    return (
      <html lang="ja">
        <body>
          <div className="d-flex justify-content-center align-items-center min-vh-100">
            <div className="text-center">
              <div className="spinner-border" role="status">
                <span className="visually-hidden">リダイレクト中...</span>
              </div>
              <p className="mt-2">ログインページに移動中...</p>
            </div>
          </div>
        </body>
      </html>
    );
  }

  // メニュー項目の定義
  const menuItems = [
    { icon: '📊', title: 'ダッシュボード', path: '/' },
    { 
      icon: '🚚', 
      title: '車両管理', 
      key: 'vehicles',
      path: '/vehicles',
      submenu: [
        { title: '車両一覧', path: '/vehicles' },
        { title: '車両登録', path: '/vehicles/add' },
        { title: '車検・点検予定', path: '/maintenance/schedule' }
      ]
    },
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
                 zIndex: 100,
                 overflowY: 'auto'
               }}>
            <div className="d-flex justify-content-between align-items-center p-3 border-bottom">
              <div className="d-flex align-items-center">
                <div style={{ width: '40px', height: '40px', position: 'relative' }}>
                  <Image 
                    src="/driveta-symbol.png" 
                    alt="DRIVETA Symbol" 
                    width={40} 
                    height={40} 
                    style={{ objectFit: 'contain' }}
                  />
                </div>
                
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
                  {item.submenu ? (
                    <>
                      <div 
                        className={`nav-link d-flex justify-content-between align-items-center ${
                          pathname.startsWith(item.path) ? 'active bg-secondary rounded' : 'text-white'
                        }`}
                        style={{ cursor: 'pointer' }}
                        onClick={() => sidebarOpen && toggleSubmenu(item.key)}
                      >
                        <div>
                          <span className="me-2">{item.icon}</span>
                          {sidebarOpen && <span>{item.title}</span>}
                        </div>
                        {sidebarOpen && (
                          <span>{expandedSubmenus[item.key] ? '▼' : '▶'}</span>
                        )}
                      </div>
                      
                      {sidebarOpen && expandedSubmenus[item.key] && (
                        <ul className="nav flex-column ms-3 mt-1 mb-1">
                          {item.submenu.map((subItem, subIndex) => (
                            <li className="nav-item mb-1" key={`${index}-${subIndex}`}>
                              <Link 
                                href={subItem.path} 
                                className={`nav-link py-1 px-3 ${
                                  pathname === subItem.path ? 'active bg-secondary rounded' : 'text-white'
                                }`}
                              >
                                <small>{subItem.title}</small>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  ) : (
                    <Link 
                      href={item.path} 
                      className={`nav-link ${
                        pathname === item.path ? 'active bg-secondary rounded' : 'text-white'
                      }`}
                    >
                      <span className="me-2">{item.icon}</span>
                      {sidebarOpen && <span>{item.title}</span>}
                    </Link>
                  )}
                </li>
              ))}
              
              {/* ログアウトボタン */}
              <li className="nav-item mt-auto">
                <button 
                  className="nav-link text-white w-100 text-start border-0 bg-transparent"
                  onClick={handleLogout}
                >
                  <span className="me-2">🚪</span>
                  {sidebarOpen && <span>ログアウト</span>}
                </button>
              </li>
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