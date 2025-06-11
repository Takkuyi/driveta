# backend/app/fuel/encoding_utils.py

import pandas as pd
import chardet

def try_multiple_encodings(file_path):
    """
    複数のエンコーディングを試してCSVファイルを読み込む
    
    Args:
        file_path (str): CSVファイルのパス
        
    Returns:
        tuple: (DataFrame, 成功したエンコーディング名)
        
    Raises:
        Exception: すべてのエンコーディングで読み込みに失敗した場合
    """
    
    # 試行するエンコーディングのリスト
    encodings = ['shift-jis', 'utf-8', 'cp932', 'euc-jp', 'iso-2022-jp']
    
    # まずchardetで自動検出を試す
    try:
        with open(file_path, 'rb') as f:
            raw_data = f.read(10000)  # 最初の10KBを読む
            result = chardet.detect(raw_data)
            if result['encoding'] and result['confidence'] > 0.7:
                detected_encoding = result['encoding']
                if detected_encoding not in encodings:
                    encodings.insert(0, detected_encoding)
    except Exception:
        pass
    
    # 各エンコーディングを順番に試す
    for encoding in encodings:
        try:
            df = pd.read_csv(file_path, encoding=encoding)
            return df, encoding
        except (UnicodeDecodeError, UnicodeError, LookupError):
            continue
        except Exception as e:
            # エンコーディング以外のエラー（ファイル形式など）
            if 'codec' not in str(e).lower() and 'encoding' not in str(e).lower():
                raise e
            continue
    
    # すべて失敗した場合
    raise Exception(f'ファイル {file_path} を読み込めませんでした。サポートされているエンコーディング: {encodings}')

def detect_csv_delimiter(file_path, encoding='shift-jis'):
    """
    CSVファイルの区切り文字を検出する
    
    Args:
        file_path (str): CSVファイルのパス
        encoding (str): ファイルのエンコーディング
        
    Returns:
        str: 検出された区切り文字
    """
    
    try:
        with open(file_path, 'r', encoding=encoding) as f:
            first_line = f.readline()
            
        # 一般的な区切り文字を試す
        delimiters = [',', '\t', ';', '|']
        delimiter_counts = {}
        
        for delimiter in delimiters:
            delimiter_counts[delimiter] = first_line.count(delimiter)
        
        # 最も多く使われている区切り文字を返す
        best_delimiter = max(delimiter_counts, key=delimiter_counts.get)
        
        # 区切り文字が見つからない場合はコンマをデフォルトとする
        if delimiter_counts[best_delimiter] == 0:
            return ','
            
        return best_delimiter
        
    except Exception:
        return ','  # デフォルト