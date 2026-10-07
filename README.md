# Near-Duplicate Document Detection Framework

A web application for comparing a collection of documents and identifying pairs whose text is highly similar but not necessarily identical. The backend preprocesses document text, creates word shingles, calculates Jaccard similarity, and classifies each pair using the selected threshold.

## Features

- Upload TXT, RTF, Markdown, and text-based PDF documents
- Enter and compare document text manually
- Compare multiple documents pairwise
- Configure the word shingle size (2–6 words)
- Configure the near-duplicate similarity threshold (0–100%)
- View actual Jaccard similarity scores and threshold classifications
- Clear or replace the current document collection

## Technologies

- **Frontend:** React 19, Vite 8, PDF.js, `rtf-to-text`
- **Backend:** Spring Boot 4, Java 17, Maven
- **Algorithm:** Text preprocessing, word shingling, Jaccard similarity

## Requirements

- Node.js 20.19 or newer (Node.js 24 was used for verification)
- Java 17
- A network connection the first time Maven Wrapper runs, to download Maven if needed

## Run locally

From the project root, install the frontend dependencies:

```powershell
npm install
```

Start the backend in one terminal:

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

The backend listens on `http://localhost:8081`.

Start the frontend in a second terminal from the project root:

```powershell
npm run dev
```

Vite serves the app at `http://localhost:5173` and proxies `/api` requests to the backend on port 8081. The Vite preview server uses port 4173 and the same API proxy.

## Build

Build the frontend:

```powershell
npm run build
```

Build and test the backend:

```powershell
cd backend
.\mvnw.cmd clean package
```

## API

The frontend sends a JSON request to `POST /api/documents/analyze`:

```json
{
  "threshold": 70,
  "shingleSize": 3,
  "documents": [
    { "name": "first.txt", "text": "Example document text." },
    { "name": "second.txt", "text": "Another example document." }
  ]
}
```

The response contains the document count, selected threshold and shingle size, the algorithm description, pairwise similarity scores and classifications, the near-duplicate count, and a summary message. Invalid thresholds, shingle sizes, or document collections return an HTTP 400 response with a message.

## Project structure

```text
.
├── backend/
│   ├── src/main/java/       # Spring Boot API, request/response models, CORS
│   ├── src/main/resources/  # Backend configuration
│   ├── src/test/java/       # Backend tests
│   ├── mvnw
│   └── pom.xml
├── public/                  # Static frontend assets
├── src/                     # React application and styles
├── index.html
├── package.json
├── package-lock.json
└── vite.config.js
```
