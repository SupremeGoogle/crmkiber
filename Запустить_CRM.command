#!/bin/bash
cd "$(dirname "$0")"

echo ""
echo "===================================================="
echo "  🎯  CRM Лиды — KiberOne Kaliningrad"
echo "===================================================="
echo ""

# Проверяем Python
if command -v python3 &>/dev/null; then
    echo "  ✅  Python найден: $(python3 --version)"
    python3 crm_desktop.py
elif command -v python &>/dev/null; then
    echo "  ✅  Python найден: $(python --version)"
    python crm_desktop.py
else
    echo "  ❌  Python не найден."
    echo ""
    echo "  Установите Python:"
    echo "  1. Откройте: https://www.python.org/downloads/"
    echo "  2. Скачайте и установите"
    echo "  3. Запустите этот файл снова"
    echo ""
    open "https://www.python.org/downloads/"
    read -p "  Нажмите Enter для выхода..."
fi
