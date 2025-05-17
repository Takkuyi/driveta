# 車両整備管理システム

運送業向けの車両管理・整備記録・ETCデータ管理システムです。

## 機能概要

- 車両情報の管理（登録、編集、一覧表示）
- 整備記録の管理（点検・修理記録の登録、履歴管理）
- 整備アラートの管理（次回点検日などの通知）
- ETCの利用データ管理（CSVインポート、統計情報）
- ユーザー認証（ログイン、権限管理）
- ダッシュボード（車両状況、アラート一覧）

## 技術スタック

### フロントエンド
- React (Next.js)
- React Bootstrap
- Tailwind CSS
- Axios

### バックエンド
- Python (Flask)
- SQLAlchemy
- Flask-Login
- JWT認証

### データベース
- MariaDB

## ディレクトリ構成

```
driveta/
├── frontend/                      # Next.js用のディレクトリ 
│   ├── app                        
│   │   ├── page.tsx               # トップページ（ダッシュボード）
│   │   ├── layout.tsx             # メインレイアウト
│   │   ├── login                  # ログイン関連ページ
│   │   ├── maintenance            # 整備記録関連ページ
│   │   ├── vehicles               # 車両管理関連ページ
│   ├── components                 # コンポーネント
│   ├── lib                        # ユーティリティ関数、API関数
│   ├── public                     # 静的ファイル
│
├── backend/                       # Flask用のディレクトリ
│   ├── app                        # APIモジュール用のディレクトリ
│   │   ├── auth                   # 認証処理モジュール
│   │   ├── etc                    # ETCデータ管理用モジュール
│   │   ├── vehicle                # 車両データ管理用モジュール
│   │   ├── maintenance            # 整備記録管理用モジュール
│   │   ├── __init__.py            # アプリケーション初期化
│   │   ├── config.py              # 設定ファイル
│   │   ├── extensions.py          # 拡張機能
│   ├── migrations                 # データベースマイグレーション
│   ├── run.py                     # 実行ファイル
│   ├── create_user.py             # ユーザー作成スクリプト
```

## セットアップ手順

### 必要条件
- Python 3.10以上
- Node.js 18以上
- MariaDB 10.5以上

### バックエンドのセットアップ

1. リポジトリをクローン
```bash
git clone https://github.com/yourusername/carManagement.git
cd carManagement
```

2. 仮想環境の作成と有効化
```bash
cd backend
python -m venv venv
# Windowsの場合
venv\Scripts\activate
# MacOS/Linuxの場合
source venv/bin/activate
```

3. 依存関係のインストール
```bash
pip install -r requirements.txt
```

4. データベースの設定
- MariaDBにデータベースを作成
```sql
CREATE DATABASE vehicle_maintenance_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'devuser'@'localhost' IDENTIFIED BY 'devpassword';
GRANT ALL PRIVILEGES ON vehicle_maintenance_db.* TO 'devuser'@'localhost';
FLUSH PRIVILEGES;
```

5. 環境変数の設定
```bash
# Windowsの場合
set FLASK_APP=run.py
set FLASK_ENV=development
# MacOS/Linuxの場合
export FLASK_APP=run.py
export FLASK_ENV=development
```

6. データベースのマイグレーション
```bash
flask db init
flask db migrate -m "Initial migration."
flask db upgrade
```

7. 管理者ユーザーの作成
```bash
python create_user.py admin adminpassword --role admin --email admin@example.com
```

8. アプリケーションの実行
```bash
python run.py
```

### フロントエンドのセットアップ

1. 依存関係のインストール
```bash
cd ../frontend
npm install
```

2. 開発サーバーの起動
```bash
npm run dev
```

3. ブラウザでアクセス
```
http://localhost:3000
```

## APIエンドポイント

### 認証関連
- POST `/api/auth/login` - ログイン
- POST `/api/auth/logout` - ログアウト
- GET `/api/auth/status` - 認証状態確認

### 車両関連
- GET `/api/vehicles` - 車両一覧の取得
- GET `/api/vehicles/<id>` - 特定車両の取得
- POST `/api/vehicles` - 車両の登録
- PUT `/api/vehicles/<id>` - 車両情報の更新
- DELETE `/api/vehicles/<id>` - 車両の削除
- GET `/api/vehicles/stats` - 車両統計の取得

### 整備記録関連
- GET `/api/maintenance/records` - 整備記録一覧の取得
- GET `/api/maintenance/records/<id>` - 特定整備記録の取得
- POST `/api/maintenance/records` - 整備記録の登録
- PUT `/api/maintenance/records/<id>` - 整備記録の更新
- DELETE `/api/maintenance/records/<id>` - 整備記録の削除
- GET `/api/maintenance/alerts` - 整備アラート一覧の取得
- POST `/api/maintenance/alerts` - 整備アラートの登録
- PUT `/api/maintenance/alerts/<id>` - 整備アラートの更新
- DELETE `/api/maintenance/alerts/<id>` - 整備アラートの削除

### ETC関連
- GET `/api/etc` - ETC利用データ一覧の取得
- GET `/api/etc/<id>` - 特定ETC利用データの取得
- POST `/api/etc` - ETC利用データの登録
- PUT `/api/etc/<id>` - ETC利用データの更新
- DELETE `/api/etc/<id>` - ETC利用データの削除
- POST `/api/etc/upload` - ETCデータCSVのインポート
- GET `/api/etc/stats` - ETC利用統計の取得

## ライセンス

このプロジェクトは [MIT ライセンス](LICENSE) のもとで公開されています。

## 開発者

DENGEKI合同会社
