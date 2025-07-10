# Google Vision API Setup Guide

## Quick Start

1. **Go to Google Cloud Console**: https://console.cloud.google.com/

2. **Create a new project** (or select existing one)

3. **Enable Vision API**:
   - Go to "APIs & Services" → "Library"
   - Search for "Cloud Vision API"
   - Click on it and press "Enable"

4. **Create Service Account**:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "Service Account"
   - Give it a name (e.g., "receipt-ocr")
   - Grant role: "Basic" → "Viewer" is enough for OCR
   - Click "Done"

5. **Download Credentials**:
   - Click on the service account you created
   - Go to "Keys" tab
   - Click "Add Key" → "Create new key"
   - Choose "JSON" format
   - Save the downloaded file

6. **Set up authentication**:
   ```bash
   # Option 1: Environment variable (recommended)
   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/credentials.json"
   
   # Option 2: Place in backend directory and rename to:
   # google-vision-credentials.json
   ```

## Pricing

- First 1,000 units/month: **FREE**
- Beyond 1,000 units: $1.50 per 1,000 units
- Each page/image = 1 unit

## Test the Setup

```bash
cd /home/jaime/MyCode/src/CarCollection/backend
source venv/bin/activate
python ocr_google_vision_poc.py
```

## Security Note

⚠️ **Never commit the credentials JSON file to Git!**

Add to `.gitignore`:
```
*credentials*.json
*.json
```