# app/employee/routes.py

from flask import Blueprint, jsonify, request
from sqlalchemy.exc import SQLAlchemyError
from datetime import datetime

from app.extensions import db
from app.employee.models import Employee

# ブループリント定義
employee_bp = Blueprint('employee', __name__, url_prefix='/api/employee')

# 従業員一覧取得
@employee_bp.route('/', methods=['GET'])
def list_employees():
    # クエリパラメータの取得
    is_driver = request.args.get('is_driver', type=bool)
    is_mechanic = request.args.get('is_mechanic', type=bool)
    is_active = request.args.get('is_active', type=bool, default=True)
    department = request.args.get('department')
    
    # クエリビルダー
    query = Employee.query
    
    # フィルタリング
    if is_driver is not None:
        query = query.filter_by(is_driver=is_driver)
    if is_mechanic is not None:
        query = query.filter_by(is_mechanic=is_mechanic)
    if is_active is not None:
        query = query.filter_by(is_active=is_active)
    if department:
        query = query.filter_by(department=department)
    
    # 従業員の取得（名前順）
    employees = query.order_by(Employee.last_name, Employee.first_name).all()
    
    # レスポンスデータの構築
    result = [{
        'id': emp.id,
        'employee_code': emp.employee_code,
        'last_name': emp.last_name,
        'first_name': emp.first_name,
        'full_name': emp.full_name,
        'department': emp.department,
        'position': emp.position,
        'is_driver': emp.is_driver,
        'is_mechanic': emp.is_mechanic,
        'is_active': emp.is_active
    } for emp in employees]
    
    return jsonify(result)

# 従業員詳細取得
@employee_bp.route('/<int:employee_id>/', methods=['GET'])
def get_employee(employee_id):
    # 従業員の取得
    is_active = request.args.get('is_active')
    employee = Employee.query.get_or_404(employee_id)


    if is_active is not None:
        # クエリパラメータは文字列なので、boolに変換
        if is_active.lower() == 'true':
            query = query.filter(Employee.is_active == True)
        elif is_active.lower() == 'false':
            query = query.filter(Employee.is_active == False)


    # レスポンスデータの構築
    result = {
        'id': employee.id,
        'employee_code': employee.employee_code,
        'last_name': employee.last_name,
        'first_name': employee.first_name,
        'last_name_kana': employee.last_name_kana,
        'first_name_kana': employee.first_name_kana,
        'full_name': employee.full_name,
        'full_name_kana': employee.full_name_kana,
        'birth_date': employee.birth_date.isoformat() if employee.birth_date else None,
        'join_date': employee.join_date.isoformat() if employee.join_date else None,
        'department': employee.department,
        'position': employee.position,
        'email': employee.email,
        'phone': employee.phone,
        'license_type': employee.license_type,
        'license_number': employee.license_number,
        'license_expiry_date': employee.license_expiry_date.isoformat() if employee.license_expiry_date else None,
        'is_driver': employee.is_driver,
        'is_mechanic': employee.is_mechanic,
        'is_active': employee.is_active,
        'notes': employee.notes,
        'created_at': employee.created_at.isoformat(),
        'updated_at': employee.updated_at.isoformat()
    }
    
    return jsonify(result)

# 従業員データの登録
@employee_bp.route('/', methods=['POST'])
def create_employee():
    data = request.json
    
    # 必須フィールドの検証
    required_fields = ['employee_code', 'last_name', 'first_name']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'必須フィールド "{field}" がありません'}), 400
    
    try:
        # 従業員コードの重複チェック
        existing = Employee.query.filter_by(employee_code=data['employee_code']).first()
        if existing:
            return jsonify({'error': f'従業員コード "{data["employee_code"]}" は既に使用されています'}), 400
        
        # 日付フィールドの変換
        birth_date = None
        if 'birth_date' in data and data['birth_date']:
            birth_date = datetime.strptime(data['birth_date'], '%Y-%m-%d').date()
        
        join_date = None
        if 'join_date' in data and data['join_date']:
            join_date = datetime.strptime(data['join_date'], '%Y-%m-%d').date()
        
        license_expiry_date = None
        if 'license_expiry_date' in data and data['license_expiry_date']:
            license_expiry_date = datetime.strptime(data['license_expiry_date'], '%Y-%m-%d').date()
        
        # 新しい従業員レコードの作成
        new_employee = Employee(
            employee_code=data['employee_code'],
            last_name=data['last_name'],
            first_name=data['first_name'],
            last_name_kana=data.get('last_name_kana'),
            first_name_kana=data.get('first_name_kana'),
            birth_date=birth_date,
            join_date=join_date,
            department=data.get('department'),
            position=data.get('position'),
            email=data.get('email'),
            phone=data.get('phone'),
            license_type=data.get('license_type'),
            license_number=data.get('license_number'),
            license_expiry_date=license_expiry_date,
            is_driver=data.get('is_driver', False),
            is_mechanic=data.get('is_mechanic', False),
            is_active=data.get('is_active', True),
            notes=data.get('notes')
        )
        
        db.session.add(new_employee)
        db.session.commit()
        
        return jsonify({
            'id': new_employee.id,
            'employee_code': new_employee.employee_code,
            'full_name': new_employee.full_name,
            'message': '従業員データを登録しました'
        }), 201
        
    except ValueError as e:
        return jsonify({'error': f'日付形式が正しくありません: {str(e)}'}), 400
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({'error': f'データベースエラー: {str(e)}'}), 500

# 以下、更新と削除のエンドポイントも追加...

# 近日中の誕生日を取得するエンドポイント
@employee_bp.route('/birthday_soon', methods=['GET'])
def get_upcoming_birthdays():
    try:
        # クエリパラメータからデータ取得
        days = request.args.get('days', default=14, type=int)  # デフォルトは14日以内
        
        # 現在の日付を取得
        today = datetime.now().date()
        
        # すべての従業員を取得（アクティブな従業員のみ）
        employees = Employee.query.filter_by(is_active=True).all()
        
        # 誕生日が近い従業員をフィルター
        upcoming_birthdays = []
        
        for employee in employees:
            # 誕生日がない場合はスキップ
            if not employee.birth_date:
                continue
            
            # 今年の誕生日を計算
            this_year_birthday = datetime(
                today.year, 
                employee.birth_date.month, 
                employee.birth_date.day
            ).date()
            
            # 誕生日が過ぎている場合は来年の誕生日を使用
            if this_year_birthday < today:
                this_year_birthday = datetime(
                    today.year + 1, 
                    employee.birth_date.month, 
                    employee.birth_date.day
                ).date()
            
            # 指定された日数以内に誕生日がある場合
            days_until_birthday = (this_year_birthday - today).days
            if days_until_birthday <= days:
                # 年齢の計算
                age = today.year - employee.birth_date.year
                if today < datetime(today.year, employee.birth_date.month, employee.birth_date.day).date():
                    age -= 1
                
                # 来年の誕生日の場合
                if this_year_birthday.year > today.year:
                    age += 1
                
                upcoming_birthdays.append({
                    '氏名': employee.full_name,
                    '生年月日': employee.birth_date.isoformat(),
                    '年齢': age,
                    '日数': days_until_birthday
                })
        
        # 日数でソート
        upcoming_birthdays.sort(key=lambda x: x['日数'])
        
        return jsonify(upcoming_birthdays)
        
    except Exception as e:
        return jsonify({'error': f'誕生日データの取得中にエラーが発生しました: {str(e)}'}), 500


# 月別の誕生日カレンダーを取得するエンドポイント（オプション）
@employee_bp.route('/birthday_calendar', methods=['GET'])
def get_birthday_calendar():
    try:
        # クエリパラメータから月を取得（デフォルトは現在の月）
        month = request.args.get('month', default=datetime.now().month, type=int)
        
        # 1〜12の範囲内かチェック
        if month < 1 or month > 12:
            return jsonify({'error': '月は1から12の間で指定してください'}), 400
        
        # 指定された月の誕生日を持つ従業員を取得
        employees = Employee.query.filter(
            extract('month', Employee.birth_date) == month,
            Employee.is_active == True
        ).all()
        
        # 結果のフォーマット
        calendar_data = []
        
        for employee in employees:
            # 現在の年と従業員の誕生月・日から誕生日を計算
            current_year = datetime.now().year
            birth_day = employee.birth_date.day
            
            # 年齢の計算
            today = datetime.now().date()
            age = today.year - employee.birth_date.year
            
            # 誕生日がまだ来ていない場合は-1
            if today < datetime(today.year, employee.birth_date.month, employee.birth_date.day).date():
                age -= 1
            
            calendar_data.append({
                '氏名': employee.full_name,
                '生年月日': employee.birth_date.isoformat(),
                '年齢': age,
                '日': birth_day,
                'department': employee.department
            })
        
        # 日付順にソート
        calendar_data.sort(key=lambda x: x['日'])
        
        return jsonify({
            'month': month,
            'month_name': calendar.month_name[month],
            'birthdays': calendar_data
        })
        
    except Exception as e:
        return jsonify({'error': f'誕生日カレンダーの取得中にエラーが発生しました: {str(e)}'}), 500