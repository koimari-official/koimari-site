@echo off
chcp 65001 > nul
echo ========================================
echo   投資ウィジェット データ更新
echo ========================================
echo.

:: Python の場所を自動検出
where python > nul 2>&1
if %errorlevel% == 0 (
    set PYTHON=python
) else (
    where python3 > nul 2>&1
    if %errorlevel% == 0 (
        set PYTHON=python3
    ) else (
        echo [エラー] Python が見つかりません。
        echo Python をインストールしてください: https://www.python.org/
        pause
        exit /b 1
    )
)

echo Pythonパス: 
%PYTHON% --version
echo.

:: fetch_data.py を実行
%PYTHON% "%~dp0fetch_data.py"

echo.
if %errorlevel% == 0 (
    echo データ更新が完了しました。
    echo ブラウザでウィジェットをリロードしてください。
) else (
    echo [エラー] データ取得に失敗しました。
)

echo.
pause
