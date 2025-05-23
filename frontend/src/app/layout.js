// src/app/layout.js
'use client';

import './globals.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';

export default function RootLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  // サブメニューの展開状態を管理
  const [expandedSubmenus, setExpandedSubmenus] = useState({
    vehicles: false // 初期状態では閉じている
  });
  const pathname = usePathname();

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // サブメニューの展開/折りたたみを切り替える関数
  const toggleSubmenu = (key) => {
    setExpandedSubmenus({
      ...expandedSubmenus,
      [key]: !expandedSubmenus[key]
    });
  };

  // メニュー項目の定義（サブメニュー付き）
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
        { title: '車検・点検予定', path: '/maintenance/schedule' } // 新しいメニュー項目
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
                 overflowY: 'auto' // スクロール可能に
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
                  {item.submenu ? (
                    <>
                      {/* サブメニューを持つ項目 */}
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
                      
                      {/* サブメニュー項目 */}
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
                    // サブメニューを持たない通常の項目
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