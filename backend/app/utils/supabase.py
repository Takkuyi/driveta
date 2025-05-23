# app/utils/supabase.py

import os
from supabase import create_client
from flask import current_app

def get_supabase_client():
    """Supabaseクライアントを取得"""
    url = current_app.config['SUPABASE_URL']
    key = current_app.config['SUPABASE_KEY']
    
    if not url or not key:
        raise ValueError("Supabase URLまたはキーが設定されていません。環境変数を確認してください。")
    
    return create_client(url, key)

def upload_to_supabase(file_data, file_path, content_type):
    """ファイルをSupabase Storageにアップロード"""
    supabase = get_supabase_client()
    bucket = current_app.config['SUPABASE_STORAGE_BUCKET']
    
    # ファイルをアップロード
    res = supabase.storage.from_(bucket).upload(
        file_path,
        file_data,
        {"content-type": content_type}
    )
    
    # 公開URLを取得
    file_url = supabase.storage.from_(bucket).get_public_url(file_path)
    
    return file_url

def delete_from_supabase(file_path):
    """Supabase Storageからファイルを削除"""
    supabase = get_supabase_client()
    bucket = current_app.config['SUPABASE_STORAGE_BUCKET']
    
    return supabase.storage.from_(bucket).remove(file_path)

def get_file_url(file_path):
    """ファイルの公開URLを取得"""
    supabase = get_supabase_client()
    bucket = current_app.config['SUPABASE_STORAGE_BUCKET']
    
    return supabase.storage.from_(bucket).get_public_url(file_path)