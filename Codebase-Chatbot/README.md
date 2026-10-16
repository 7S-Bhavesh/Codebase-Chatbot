# Codebase-Chatbot

A full-stack AI-powered codebase chatbot application that allows users to chat with their GitHub repositories using Retrieval Augmented Generation (RAG). The system indexes code repositories and provides intelligent answers based on the actual codebase content.

## 🏗️ Architecture Overview

This project consists of three main components working together:

1. **Frontend** - React-based user interface
2. **Main Server** - Express.js API server handling requests and business logic
3. **Private Server** - Background worker processing repository indexing jobs

The system uses a microservices architecture with:
- **PostgreSQL** - Relational database for user data, repositories, chats, and prompts
- **Weaviate** - Vector database for semantic search of code chunks
- **BullMQ + Redis (Upstash)** - Job queue system for asynchronous processing
- **JinaAI** - Embedding service for vectorizing code chunks
- **Google Gemini** - LLM for generating responses

---

## 🔐 Main Server - API & Business Logic

The Main Server (`Main server/`) is the central API server that handles all HTTP requests, authentication, and coordinates between the frontend, database, and background workers.

### What It Does

#### 1. **Authentication System**
- **User Registration**: Creates new user accounts with bcrypt-hashed passwords
- **User Login**: Validates credentials and issues JWT tokens (7-day expiration)
- **Protected Routes**: Middleware validates JWT tokens on protected endpoints
- **User Management**: Stores user data (name, email, password) in PostgreSQL

#### 2. **Repository Management**
When a user submits a GitHub repository URL:
- **Stores Repository Metadata**: Saves the repository URL and associated user email to PostgreSQL
- **Queues Indexing Job**: Immediately adds a job to the BullMQ queue (`repo-index-queue`) with the repository URL and user email
- **Returns Immediately**: The API responds quickly while indexing happens in the background
- **Repository CRUD**: Users can view all their repositories, get specific repository details, and delete repositories

#### 3. **Chat & Prompt System**
- **Chat Creation**: Creates new chat sessions associated with a repository
- **Prompt Handling**: When a user sends a question:
  1. Creates a prompt record in the database with status "processing"
  2. Immediately responds to the frontend with the prompt ID
  3. Asynchronously processes the query using RAG:
     - Retrieves relevant code chunks from Weaviate using semantic search
     - Filters results by user email and repository URL
     - Builds an augmented prompt with context
     - Sends to Gemini LLM for answer generation
     - Updates the prompt record with the generated response
- **Chat History**: Retrieves all prompts and responses for a chat session

#### 4. **RAG (Retrieval Augmented Generation) Pipeline**
The Main Server performs intelligent code search and answer generation:

**Semantic Search Process**:
- Takes user's natural language query
- Searches Weaviate vector database using `nearText` query
- Retrieves top 5 most semantically similar code chunks
- Filters results to only include chunks from the user's specific repository
- Each chunk includes metadata: file path, repository URL, user ID, and similarity score

**Answer Generation**:
- Builds an augmented prompt that includes:
  - User's original question
  - Retrieved code snippets with their source files
  - Similarity scores for each snippet
  - Instructions to answer using only the provided code context
- Sends the augmented prompt to Google Gemini 2.5 Flash model
- Returns the generated answer with references to source code

### Key Technologies Used
- **Express.js** - Web framework
- **Sequelize** - PostgreSQL ORM
- **BullMQ** - Job queue client (adds jobs to queue)
- **Weaviate Client** - Vector database queries
- **Google Gemini API** - LLM for answer generation
- **JWT** - Authentication tokens
- **bcrypt** - Password hashing

---

## ⚙️ Private Server - Background Worker

The Private Server (`Private server/`) is a dedicated background worker that processes repository indexing jobs asynchronously. It runs independently from the Main Server and handles the computationally intensive task of indexing codebases.

### What It Actually Does

#### 1. **Queue Worker Initialization**
- Connects to Redis/Upstash using BullMQ configuration
- Creates a Worker instance listening to the `repo-index-queue`
- Processes up to 5 jobs concurrently (configurable)
- Runs continuously, waiting for new indexing jobs

#### 2. **Repository Indexing Process**

When a job is received from the queue, the worker performs the following steps:

**Step 1: Repository Cloning**
- Creates a temporary directory in the system's temp folder
- Clones the GitHub repository using `git clone --depth 1` (shallow clone for efficiency)
- Uses the repository URL and user email from the job data

**Step 2: File Discovery**
- Scans the cloned repository using glob patterns
- Filters out unnecessary files:
  - `node_modules/` directories
  - `.git/` directories
  - Markdown files (`*.md`)
  - JSON files (`*.json`)
  - Lock files (`*.lock`)
- Collects all code files from the repository

**Step 3: Code Processing & Chunking**
For each code file:
- Loads the file content using LangChain's TextLoader
- Determines the programming language based on file extension:
  - JavaScript/TypeScript (`.js`, `.jsx`, `.ts`, `.tsx`)
  - Python (`.py`)
  - Java (`.java`)
  - Go (`.go`)
  - C++ (`.cpp`)
  - PHP (`.php`)
- Uses language-specific text splitters:
  - Language-aware splitters for recognized languages (800 char chunks, 100 char overlap)
  - Generic splitter for unknown languages (1000 char chunks, 100 char overlap)
- Creates multiple chunks from each file to handle large files

**Step 4: Metadata Enrichment**
For each code chunk:
- Adds metadata:
  - `source`: Original file path
  - `repo`: Repository URL
  - `userid`: User's email address
- Prepends file name to chunk content for better context
- Formats chunk as: `File: filename.js\n\n[code content]`

**Step 5: Vector Database Storage**
- Connects to Weaviate cloud instance
- Uses the `RepoCodeChunk` collection
- Transforms chunks into Weaviate data objects:
  - `text`: The code chunk content
  - `repourl`: Repository URL
  - `userid`: User email
- Bulk inserts all chunks into Weaviate
- Weaviate automatically:
  - Generates embeddings using JinaAI (configured via headers)
  - Stores vectors for semantic search
  - Indexes the data for fast retrieval

**Step 6: Cleanup**
- Removes the temporary cloned repository directory
- Logs completion or errors

### Why This Architecture?

**Separation of Concerns**:
- Main Server stays responsive for API requests
- Heavy processing happens asynchronously
- Can scale workers independently

**Scalability**:
- Multiple Private Server instances can process jobs in parallel
- Queue system handles job distribution
- Concurrency control (5 jobs at once) prevents resource exhaustion

**Reliability**:
- Jobs are persisted in Redis
- Failed jobs can be retried
- Worker failures don't affect the API server

### Key Technologies Used
- **BullMQ Worker** - Job queue worker
- **LangChain** - Document loading and text splitting
- **Weaviate Client** - Vector database operations
- **JinaAI** - Embedding generation (via Weaviate)
- **Node.js fs & child_process** - File system and git operations

---

## 🔄 Complete User Flow

### 1. User Registration & Login
1. User registers with name, email, password
2. Password is hashed with bcrypt and stored
3. User logs in and receives JWT token
4. Token is used for all subsequent authenticated requests

### 2. Adding a Repository
1. User submits GitHub repository URL via frontend
2. Main Server saves repository metadata to PostgreSQL
3. Main Server adds indexing job to BullMQ queue
4. API responds immediately with repository record
5. Private Server worker picks up the job
6. Worker clones, processes, and indexes the repository
7. Code chunks are stored in Weaviate with embeddings

### 3. Asking Questions
1. User selects a repository and asks a question
2. Main Server creates a prompt record (status: "processing")
3. API responds immediately with prompt ID
4. Background process:
   - Queries Weaviate for semantically similar code chunks
   - Filters by user email and repository URL
   - Builds augmented prompt with context
   - Sends to Gemini LLM
   - Updates prompt record with answer
5. Frontend polls or receives update with the answer

---

## 📁 Project Structure

```
Codebase-Chatbot/
├── Frontend/                 # React frontend application
│   ├── src/
│   │   ├── pages/           # Chat, Login, Register, Repos pages
│   │   ├── components/      # Reusable UI components
│   │   ├── context/         # Auth context for state management
│   │   └── services/        # API service layer
│
├── Main server/              # Express.js API server
│   ├── controllers/         # Request handlers
│   │   ├── authController.js      # Registration & login
│   │   ├── repoInputController.js # Repository management
│   │   ├── promptController.js    # Prompt & RAG handling
│   │   └── chatController.js      # Chat management
│   ├── models/              # Sequelize database models
│   ├── routes/              # API route definitions
│   ├── middleware/          # Auth middleware
│   ├── util/                # RAG utilities
│   │   ├── ragOutput.js     # RAG query & generation
│   │   └── augmenter.js     # Prompt augmentation
│   ├── client/              # Weaviate client connection
│   ├── config/              # BullMQ queue configuration
│   └── db/                  # Database connection setup
│
├── Private server/          # Background worker
│   └── src/
│       ├── handler/
│       │   └── indexer.js   # Repository indexing logic
│       ├── config/
│       │   ├── bullmq.config.js    # Redis connection
│       │   └── vectordb.config.js  # Weaviate connection
│       └── index.js         # Worker initialization
│
└── docker-compose.yml       # Multi-container orchestration
```

---

## 🗄️ Database Schema

### PostgreSQL Tables (via Sequelize)

**AUTH Table**
- `user_id` (Primary Key)
- `name`
- `email` (Unique)
- `password` (Hashed)

**REPO_INPUT Table**
- `repo_id` (Primary Key)
- `email` (Foreign Key to AUTH)
- `repo_url`
- `created_at`

**CHAT Table**
- `chat_id` (Primary Key)
- `repo_id` (Foreign Key to REPO_INPUT)
- `created_at`

**PROMPT Table**
- `prompt_id` (Primary Key)
- `chat_id` (Foreign Key to CHAT)
- `prompt` (User's question)
- `response` (Generated answer)
- `created_at`

### Weaviate Collection

**RepoCodeChunk Collection**
- `text` - Code chunk content
- `repourl` - Repository URL
- `userid` - User email
- Vector embeddings (auto-generated by JinaAI)

---

## 🚀 Getting Started

### Prerequisites
- Node.js
- Docker & Docker Compose
- PostgreSQL (or use Docker)
- Redis/Upstash account
- Weaviate Cloud account
- JinaAI API key
- Google Gemini API key

### Environment Variables

**Main Server** (`Main server/.env`):
```
PORT=5000
JWT_SECRET=your-secret-key
POSTGRES_DB_NAME=postgres
POSTGRES_USERNAME=postgres
POSTGRES_PASSWORD=your-password
POSTGRES_HOST=localhost
FRONTEND_URL=http://localhost:3000
WEAVIATE_URL=your-weaviate-url
WEAVIATE_API_KEY=your-weaviate-key
JINA_API_KEY=your-jina-key
GEMINI_API_KEY=your-gemini-key
UPSTASH_PASSWORD=your-upstash-password
```

**Private Server** (`Private server/.env`):
```
WEAVIATE_URL=your-weaviate-url
WEAVIATE_API_KEY=your-weaviate-key
JINA_API_KEY=your-jina-key
UPSTASH_PASSWORD=your-upstash-password
```

### Running with Docker Compose

```bash
docker-compose up -d
```

This starts:
- PostgreSQL database
- Main Server (port 5000)
- Frontend (port 3000)
- Private Server worker

### Running Locally

**Main Server**:
```bash
cd "Main server"
npm install
npm run dev
```

**Private Server**:
```bash
cd "Private server"
npm install
npm run dev
```

**Frontend**:
```bash
cd Frontend
npm install
npm run dev
```

---

## 🔍 Key Features

- ✅ User authentication with JWT
- ✅ GitHub repository indexing
- ✅ Semantic code search using vector embeddings
- ✅ RAG-based question answering
- ✅ Multi-repository support per user
- ✅ Chat history and conversation management
- ✅ Asynchronous job processing
- ✅ Language-aware code chunking
- ✅ Filtered search (user-specific, repo-specific)

---

## 🛠️ Technology Stack

- **Frontend**: React, Vite, TailwindCSS
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL (Sequelize ORM)
- **Vector DB**: Weaviate Cloud
- **Queue**: BullMQ + Redis (Upstash)
- **Embeddings**: JinaAI
- **LLM**: Google Gemini 2.5 Flash
- **Authentication**: JWT, bcrypt
- **Containerization**: Docker, Docker Compose

---

## 📝 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Repositories
- `POST /api/repo/save-repo` - Add repository (queues indexing)
- `GET /api/repo/get-repo/:repo_id` - Get repository details
- `GET /api/repo/get-all-repos/:email` - Get all user repositories
- `DELETE /api/repo/delete-repo/:repo_id` - Delete repository

### Prompts & Chats
- `POST /api/prompt/save-prompt` - Submit question (triggers RAG)
- `GET /api/prompt/get-prompts/:chat_id` - Get chat history
- `GET /api/chat/get-chat/:chat_id` - Get chat details
- `GET /api/chat/get-all-chats/:repo_id` - Get all chats for repository

---

## 🔐 Security Features

- Password hashing with bcrypt (10 rounds)
- JWT token-based authentication
- CORS protection
- SQL injection prevention (Sequelize ORM)
- Environment variable configuration
- Token expiration (7 days)

---

## 📊 Performance Considerations

- **Asynchronous Processing**: Heavy indexing jobs don't block API responses
- **Concurrent Workers**: Private Server processes 5 jobs simultaneously
- **Shallow Git Clones**: Only clones latest commit (`--depth 1`)
- **Chunked Processing**: Large files are split into manageable chunks
- **Vector Search**: Fast semantic search using Weaviate's optimized indexes
- **Connection Pooling**: Database connections are managed efficiently

---

## 🐛 Error Handling

- Try-catch blocks in all async operations
- Graceful error responses with appropriate HTTP status codes
- Detailed error messages in development mode
- Queue job retry mechanisms (via BullMQ)
- Database transaction rollbacks on failures
- Temporary file cleanup even on errors

---

## 📈 Future Enhancements

Potential improvements:
- Real-time WebSocket updates for prompt processing
- Support for private repositories (GitHub tokens)
- Code syntax highlighting in responses
- Multi-file context in answers
- Repository indexing status tracking
- Incremental updates (only index changed files)
- Support for more programming languages
- Code snippet references with line numbers

---

## 📄 License

[Add your license here]

---

## 👥 Contributors

[Add contributors here]
