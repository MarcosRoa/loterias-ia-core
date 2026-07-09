# 🧠 Loteria IA Core - Núcleo de IA para Railway

API para geração de jogos de loteria com inteligência artificial.

## 🚀 Endpoints

### Health Check
GET /health

text

### Gerar Jogos
POST /api/generate
Headers:
x-api-key: sua_chave_secreta
Body:
{
"lotteryType": "megasena",
"count": 3,
"method": "smart"
}

text

### Analisar Histórico
POST /api/analyze
Headers:
x-api-key: sua_chave_secreta
Body:
{
"lotteryType": "megasena",
"history": [{"numbers": [1,2,3,4,5,6]}]
}

text

### Predição
POST /api/predict
Headers:
x-api-key: sua_chave_secreta
Body:
{
"lotteryType": "megasena",
"history": [...],
"count": 3
}

text

## 🎯 Loterias Suportadas

- Mega-Sena
- Quina
- Lotofácil
- Lotomania
- Dupla Sena
- Timemania
- +Milionária
- Dia de Sorte
- Super Sete

## 📦 Instalação

```bash
npm install
npm run build
npm start
🔧 Variáveis de Ambiente
Variável	Obrigatório	Descrição
PORT	Sim	Porta do servidor
API_SECRET_KEY	Sim	Chave para autenticação
ALLOWED_ORIGINS	Não	Origens permitidas (CORS)
NODE_ENV	Não	Ambiente (development/production)
📄 Licença
MIT
