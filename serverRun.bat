::npm-install.bat
@echo off
@echo "@@@@@@@@@@start redis server@@@@@@@@@@"
:: redis-server --service-stop
:: redis-server --service-start
@echo "@@@@@@@@@@start game-server@@@@@@@@@@"
cd game-server && pomelo start

pause