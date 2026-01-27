# Case Review - Hackathon Project

AI-powered case review and analysis platform built with React, Node.js, and MongoDB.

## Tech Stack

### Frontend
- **React 18** with Vite
- **@nutanix-ui/prism-reactjs** - Nutanix UI components
- **@nutanix-ui/ntnx-react-charts** - Nutanix charting library
- **React Router** v7 - Client-side routing
- **Axios** - HTTP client

### Backend
- **Node.js** with Express
- **MongoDB** with Mongoose ODM
- **OpenAI SDK** - LLM integration

## Project Structure

```
hack-12-case-review/
├── frontend/                 # React frontend application
│   ├── public/              # Static assets
│   ├── src/
│   │   ├── pages/           # Page components
│   │   ├── components/      # Reusable components
│   │   ├── services/        # API services
│   │   └── styles/          # Global styles
│   ├── index.html
│   └── vite.config.js
│
├── backend/                  # Node.js backend API
│   └── src/
│       ├── config/          # Configuration files
│       ├── models/          # MongoDB models
│       ├── routes/          # API routes
│       └── services/        # Business logic & LLM
│
├── package.json             # Root package.json (workspaces)
└── README.md
```

## Getting Started

### Prerequisites
- Node.js >= 20.0.0
- MongoDB (local or Atlas)
- LLM API key (OpenAI or Azure OpenAI)

### Installation

1. Clone the repository and install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your configuration
```

3. Start MongoDB (if running locally):
```bash
mongod --dbpath /path/to/data
```

4. Run the development servers:
```bash
npm run dev
```

This will start:
- Frontend at http://localhost:3000
- Backend at http://localhost:5000

### Individual Commands

```bash
# Run only frontend
npm run dev:frontend

# Run only backend
npm run dev:backend

# Build frontend for production
npm run build

# Start production server
npm run start

# Lint all code
npm run lint

# Format code with Prettier
npm run format
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api` | API info |
| GET | `/api/health` | Health check |
| GET | `/api/llm/status` | LLM service status |
| POST | `/api/llm/completion` | Generate LLM completion |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Backend server port | 5000 |
| `NODE_ENV` | Environment | development |
| `MONGODB_URI` | MongoDB connection string | mongodb://localhost:27017/case-review |
| `LLM_PROVIDER` | LLM provider (openai/azure) | openai |
| `LLM_API_KEY` | API key for LLM provider | - |
| `LLM_MODEL` | Model to use | gpt-4 |

## License

MIT

