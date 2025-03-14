## Quickstart

```bash
# Install all dependencies
pnpm install

# Setup your backend .env using the example provided
# Optionally, edit the apps/backend/.env file to set your OpenAI API key to try the GPT-3.5 or GPT-4 the langchain demo
cd apps/backend
cp .env.example .env

# Run the database migrations on a postgres DB for development
pnpm run migrate-postgres

# Get back into the root of the project
cd ../..

# Start the full-stack demo
pnpm run dev

# 🚀 See the demo running now on http://localhost:5173/
```
