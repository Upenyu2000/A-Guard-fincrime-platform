FROM python:3.13-slim

WORKDIR /app
COPY services/ai/requirements.txt ./services/ai/requirements.txt
RUN pip install --no-cache-dir -r services/ai/requirements.txt
COPY services ./services

EXPOSE 8001
CMD ["python", "-m", "uvicorn", "services.ai.app.main:app", "--host", "0.0.0.0", "--port", "8001"]
