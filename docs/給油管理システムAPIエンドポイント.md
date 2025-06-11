# 給油管理システム API エンドポイント

## 🔥 エネフレ（Enefle）関連API

### CSVアップロード・インポート
- `POST /api/fuel/enefle/upload`
  - エネフレCSVファイルのアップロードとインポート
  - リクエスト: multipart/form-data (file)
  - レスポンス: インポート結果統計

### データ取得
- `GET /api/fuel/enefle/`
  - エネフレ給油データ一覧取得（ページネーション対応）
  - クエリパラメータ:
    - `page`: ページ番号 (default: 1)
    - `per_page`: 1ページあたりの件数 (max: 100, default: 50)
    - `vehicle_number`: 車両番号フィルタ
    - `start_date`: 開始日 (YYYY-MM-DD)
    - `end_date`: 終了日 (YYYY-MM-DD)
    - `fuel_only`: 給油データのみ (default: true)

- `GET /api/fuel/enefle/{record_id}`
  - 特定のエネフレ給油データ取得

- `GET /api/fuel/enefle/summary`
  - エネフレ給油データ統計情報
  - クエリパラメータ: `start_date`, `end_date`

### データ削除
- `DELETE /api/fuel/enefle/{record_id}`
  - エネフレ給油データの削除

## 🔥 エネオスウィング（ENEOS Wing）関連API

### CSVアップロード・インポート
- `POST /api/fuel/eneos-wing/upload`
  - エネオスウィングCSVファイルのアップロードとインポート

### データ取得
- `GET /api/fuel/eneos-wing/`
  - エネオスウィング給油データ一覧取得
  - クエリパラメータ: エネフレと同様

- `GET /api/fuel/eneos-wing/summary`
  - エネオスウィング給油データ統計情報

## 🔥 キタセキ社関連API

### CSVアップロード・インポート
- `POST /api/fuel/kitaseki/upload`
  - キタセキ社CSVファイルのアップロードとインポート

### データ取得
- `GET /api/fuel/kitaseki/`
  - キタセキ社給油データ一覧取得
  - クエリパラメータ: 他と同様

- `GET /api/fuel/kitaseki/{record_id}`
  - 特定のキタセキ社給油データ取得

- `GET /api/fuel/kitaseki/summary`
  - キタセキ社給油データ統計情報

- `GET /api/fuel/kitaseki/vehicles`
  - キタセキ社データに含まれる車両一覧

### データ削除
- `DELETE /api/fuel/kitaseki/{record_id}`
  - キタセキ社給油データの削除

## 🔥 統合・横断分析API

### 全社統合統計
- `GET /api/fuel/summary`
  - 全社合計の給油データ統計（エネフレ + エネオスウィング + キタセキ）
  - クエリパラメータ: `start_date`, `end_date`
  - レスポンス:
    ```json
    {
      "combined_summary": {
        "total_transactions": 1500,
        "total_liters": 45000.5,
        "total_amount": 6750000
      },
      "by_company": {
        "enefle": { "transactions": 800, "liters": 24000, "amount": 3600000 },
        "eneos_wing": { "transactions": 500, "liters": 15000, "amount": 2250000 },
        "kitaseki": { "transactions": 200, "liters": 6000.5, "amount": 900000 }
      },
      "top_vehicles": [...]
    }
    ```

## 📊 レスポンス例

### 給油データ一覧レスポンス
```json
{
  "records": [
    {
      "id": 1,
      "transaction_date": "2025-06-01",
      "vehicle_number": "群馬100あ1234",
      "station_name": "○○SS",
      "product_name": "軽油",
      "quantity": 45.5,
      "unit_price": 150.0,
      "total_amount": 6825
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 50,
    "total": 150,
    "pages": 3,
    "has_prev": false,
    "has_next": true
  }
}
```

### 統計情報レスポンス
```json
{
  "summary": {
    "total_transactions": 150,
    "total_liters": 4500.5,
    "total_amount": 675000,
    "avg_unit_price": 150.0,
    "unique_vehicles": 25
  },
  "top_vehicles": [
    {
      "vehicle_number": "群馬100あ1234",
      "transaction_count": 15,
      "total_liters": 675.5,
      "total_amount": 101325
    }
  ]
}
```

## 🔧 CSVインポートレスポンス
```json
{
  "message": "CSVインポートが完了しました",
  "total_rows": 1000,
  "imported_count": 950,
  "skipped_count": 30,
  "error_count": 20,
  "errors": [
    "行 15: 日付形式が正しくありません",
    "行 23: 車番が空です"
  ]
}
```

## 🚨 エラーレスポンス
```json
{
  "error": "データ取得中にエラーが発生しました"
}
```

## 📝 注意事項
- CSVファイルは`multipart/form-data`形式でアップロード
- 日付フィルタは`YYYY-MM-DD`形式
- ページネーションは最大100件/ページ
- 給油データのみフィルタは消費税調整データを除外
- 重複データは自動的にスキップされる