#!/usr/bin/env python3
"""
OCR Receipt Proof of Concept using Google Vision API
Extracts service information from repair shop receipts with better accuracy
"""

import os
import re
import json
from datetime import datetime
from decimal import Decimal
from typing import Dict, List, Optional, Tuple
import base64

# Check if required packages are installed
try:
    from google.cloud import vision
    from google.oauth2 import service_account
    import pdf2image
    from PIL import Image
    import io
except ImportError as e:
    print(f"Missing required package: {e}")
    print("\nPlease install required packages:")
    print("pip install google-cloud-vision pdf2image pillow")
    print("\nFor PDF support, also install poppler:")
    print("Ubuntu/Debian: sudo apt-get install poppler-utils")
    exit(1)


class GoogleVisionReceiptOCR:
    """Extract service information from repair receipts using Google Vision API"""
    
    def __init__(self, credentials_path: Optional[str] = None):
        """
        Initialize Google Vision client
        
        Args:
            credentials_path: Path to Google Cloud service account JSON file
                            If not provided, will use GOOGLE_APPLICATION_CREDENTIALS env var
        """
        if credentials_path and os.path.exists(credentials_path):
            credentials = service_account.Credentials.from_service_account_file(
                credentials_path
            )
            self.client = vision.ImageAnnotatorClient(credentials=credentials)
        else:
            # This will use the GOOGLE_APPLICATION_CREDENTIALS environment variable
            self.client = vision.ImageAnnotatorClient()
        
        # Common patterns for receipt parsing
        self.date_patterns = [
            r'\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b',  # MM/DD/YYYY or MM-DD-YYYY
            r'\b(\d{4}[/-]\d{1,2}[/-]\d{1,2})\b',      # YYYY-MM-DD
            r'\b([A-Z][a-z]{2,8}\s+\d{1,2},?\s+\d{4})\b',  # Jan 15, 2024
        ]
        
        self.money_patterns = [
            r'\$\s*(\d+(?:,\d{3})*(?:\.\d{2})?)',  # $1,234.56
            r'(\d+(?:,\d{3})*\.\d{2})\s*(?:USD)?',  # 1234.56 or 1234.56 USD
        ]
        
        self.invoice_patterns = [
            r'(?:Invoice|Inv|Order|RO|W/O|Work Order)[\s#:]*(\w+)',
            r'(?:Receipt|Ticket)[\s#:]*(\w+)',
        ]
        
        # Keywords for identifying line item types
        self.parts_keywords = ['part', 'filter', 'oil', 'brake', 'tire', 'belt', 'fluid', 'coolant', 
                               'spark', 'plug', 'battery', 'seal', 'gasket', 'pump']
        self.labor_keywords = ['labor', 'service', 'install', 'replace', 'diagnose', 'inspect', 
                              'repair', 'rebuild', 'remove', 'perform']
        self.tax_keywords = ['tax', 'taxes', 'gst', 'pst', 'hst', 'vat', 'sales tax']
        self.total_keywords = ['total', 'amount due', 'balance', 'grand total', 'total due']
    
    def convert_pdf_to_image(self, pdf_path: str) -> bytes:
        """Convert PDF to image bytes for Google Vision"""
        images = pdf2image.convert_from_path(pdf_path, dpi=300)
        if not images:
            raise ValueError("No pages found in PDF")
        
        # Convert first page to bytes
        img_byte_arr = io.BytesIO()
        images[0].save(img_byte_arr, format='PNG')
        return img_byte_arr.getvalue()
    
    def extract_text_and_structure(self, file_path: str) -> Tuple[str, vision.AnnotateImageResponse]:
        """Extract text and document structure using Google Vision API"""
        # Read file content
        if file_path.lower().endswith('.pdf'):
            content = self.convert_pdf_to_image(file_path)
        else:
            with open(file_path, 'rb') as f:
                content = f.read()
        
        image = vision.Image(content=content)
        
        # Use document text detection for better structure understanding
        response = self.client.document_text_detection(image=image)
        
        if response.error.message:
            raise Exception(f'Google Vision API error: {response.error.message}')
        
        return response.full_text_annotation.text, response
    
    def extract_table_data(self, response: vision.AnnotateImageResponse) -> List[List[str]]:
        """Extract table-like data from the document"""
        # This is a simplified table extraction
        # Google Vision doesn't directly provide table structure, 
        # but we can use block and paragraph analysis
        
        tables = []
        if not response.full_text_annotation:
            return tables
        
        # Group text by vertical position to identify rows
        text_elements = []
        for page in response.full_text_annotation.pages:
            for block in page.blocks:
                for paragraph in block.paragraphs:
                    for word in paragraph.words:
                        word_text = ''.join([symbol.text for symbol in word.symbols])
                        # Get bounding box
                        vertices = word.bounding_box.vertices
                        y_pos = (vertices[0].y + vertices[2].y) / 2  # Average Y position
                        x_pos = vertices[0].x
                        text_elements.append({
                            'text': word_text,
                            'x': x_pos,
                            'y': y_pos
                        })
        
        # Group by similar Y positions (same line)
        if text_elements:
            text_elements.sort(key=lambda x: (x['y'], x['x']))
            
            current_line = []
            current_y = text_elements[0]['y']
            line_threshold = 10  # Pixels threshold for same line
            
            lines = []
            for element in text_elements:
                if abs(element['y'] - current_y) <= line_threshold:
                    current_line.append(element['text'])
                else:
                    if current_line:
                        lines.append(' '.join(current_line))
                    current_line = [element['text']]
                    current_y = element['y']
            
            if current_line:
                lines.append(' '.join(current_line))
            
            return lines
        
        return []
    
    def parse_line_items(self, lines: List[str]) -> Dict[str, List[Dict]]:
        """Parse line items from receipt lines"""
        items = {
            'parts': [],
            'labor': [],
            'tax': [],
            'other': [],
            'totals': []
        }
        
        for line in lines:
            # Skip empty lines
            if not line.strip():
                continue
            
            # Look for money amounts in the line
            money_matches = []
            for pattern in self.money_patterns:
                matches = re.finditer(pattern, line)
                for match in matches:
                    amount_str = match.group(1).replace(',', '')
                    try:
                        amount = float(amount_str)
                        money_matches.append({
                            'amount': amount,
                            'position': match.start()
                        })
                    except ValueError:
                        pass
            
            if not money_matches:
                continue
            
            # Get the description (text before the last money amount)
            last_money_pos = money_matches[-1]['position']
            description = line[:last_money_pos].strip()
            amount = money_matches[-1]['amount']
            
            # Categorize the line item
            desc_lower = description.lower()
            
            # Check for totals first
            if any(keyword in desc_lower for keyword in self.total_keywords):
                items['totals'].append({
                    'description': description,
                    'amount': amount,
                    'full_line': line
                })
            # Check for tax
            elif any(keyword in desc_lower for keyword in self.tax_keywords):
                items['tax'].append({
                    'description': description,
                    'amount': amount,
                    'full_line': line
                })
            # Check for parts
            elif any(keyword in desc_lower for keyword in self.parts_keywords):
                items['parts'].append({
                    'description': description,
                    'amount': amount,
                    'full_line': line
                })
            # Check for labor
            elif any(keyword in desc_lower for keyword in self.labor_keywords):
                items['labor'].append({
                    'description': description,
                    'amount': amount,
                    'full_line': line
                })
            else:
                # If we can't categorize, add to other
                items['other'].append({
                    'description': description,
                    'amount': amount,
                    'full_line': line
                })
        
        return items
    
    def extract_receipt_data(self, file_path: str) -> Dict:
        """Main method to extract all data from receipt"""
        print(f"\nProcessing with Google Vision API: {file_path}")
        print("-" * 50)
        
        try:
            # Extract text and structure
            text, response = self.extract_text_and_structure(file_path)
            
            if not text:
                return {'error': 'No text extracted from image'}
            
            # Extract structured lines
            lines = self.extract_table_data(response)
            
            # Parse line items
            categorized_items = self.parse_line_items(lines)
            
            # Extract dates
            dates = []
            for pattern in self.date_patterns:
                matches = re.findall(pattern, text, re.IGNORECASE)
                dates.extend(matches)
            
            # Extract invoice number
            invoice_num = None
            for pattern in self.invoice_patterns:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    invoice_num = match.group(1)
                    break
            
            # Find shop info (usually at the top)
            lines_list = text.split('\n')
            shop_name = ''
            shop_phone = ''
            shop_address = ''
            
            # Phone pattern
            phone_pattern = r'(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})'
            
            for i, line in enumerate(lines_list[:15]):  # Check first 15 lines
                line = line.strip()
                
                # Look for shop name (often in caps or larger text)
                if not shop_name and line and line.isupper() and len(line) > 5:
                    shop_name = line
                
                # Look for phone
                phone_match = re.search(phone_pattern, line)
                if phone_match and not shop_phone:
                    shop_phone = phone_match.group(1)
                
                # Look for address
                if any(word in line.lower() for word in ['street', 'st', 'avenue', 'ave', 'road', 'rd', 'blvd', 'suite']):
                    if not shop_address:
                        shop_address = line
            
            # Calculate totals
            parts_total = sum(item['amount'] for item in categorized_items['parts'])
            labor_total = sum(item['amount'] for item in categorized_items['labor'])
            tax_total = sum(item['amount'] for item in categorized_items['tax'])
            
            # Find the grand total
            receipt_total = 0
            if categorized_items['totals']:
                # Get the largest total (likely the grand total)
                receipt_total = max(item['amount'] for item in categorized_items['totals'])
            
            result = {
                'image_file': os.path.basename(file_path),
                'shop_name': shop_name,
                'shop_phone': shop_phone,
                'shop_address': shop_address,
                'invoice_number': invoice_num,
                'dates_found': dates,
                'service_date': dates[0] if dates else None,
                'parts_total': parts_total,
                'labor_total': labor_total,
                'tax_total': tax_total,
                'receipt_total': receipt_total,
                'categorized_items': categorized_items,
                'structured_lines': lines[:20],  # First 20 lines for debugging
                'raw_text_sample': text[:1000] + '...' if len(text) > 1000 else text
            }
            
            return result
            
        except Exception as e:
            return {
                'error': str(e),
                'image_file': os.path.basename(file_path)
            }
    
    def print_results(self, data: Dict):
        """Pretty print the extracted data"""
        if 'error' in data:
            print(f"\nError: {data['error']}")
            return
        
        print("\n=== GOOGLE VISION EXTRACTED DATA ===")
        print(f"Shop: {data['shop_name']}")
        print(f"Phone: {data['shop_phone']}")
        print(f"Address: {data['shop_address']}")
        print(f"Invoice #: {data['invoice_number']}")
        print(f"Date: {data['service_date']}")
        print(f"\n--- COST BREAKDOWN ---")
        print(f"Parts Total: ${data['parts_total']:.2f}")
        print(f"Labor Total: ${data['labor_total']:.2f}")
        print(f"Tax Total: ${data['tax_total']:.2f}")
        print(f"Receipt Total: ${data['receipt_total']:.2f}")
        
        items = data.get('categorized_items', {})
        
        if items.get('parts'):
            print("\n--- PARTS ---")
            for item in items['parts']:
                print(f"  {item['description']}: ${item['amount']:.2f}")
        
        if items.get('labor'):
            print("\n--- LABOR ---")
            for item in items['labor']:
                print(f"  {item['description']}: ${item['amount']:.2f}")
        
        if items.get('totals'):
            print("\n--- TOTALS FOUND ---")
            for item in items['totals']:
                print(f"  {item['description']}: ${item['amount']:.2f}")


def main():
    """Test Google Vision OCR on receipt images"""
    
    # Check for Google Cloud credentials
    creds_path = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS')
    if not creds_path:
        print("\n⚠️  Google Cloud credentials not found!")
        print("\nTo use Google Vision API, you need to:")
        print("1. Create a Google Cloud project")
        print("2. Enable the Vision API")
        print("3. Create a service account and download the JSON key")
        print("4. Set the environment variable:")
        print("   export GOOGLE_APPLICATION_CREDENTIALS='path/to/your/credentials.json'")
        print("\nAlternatively, pass the credentials path to GoogleVisionReceiptOCR()")
        
        # Look for any JSON files that might be credentials
        json_files = [f for f in os.listdir('.') if f.endswith('.json')]
        if json_files:
            print(f"\nFound JSON files in current directory: {json_files}")
            print("If one of these is your credentials file, you can use it.")
        
        return
    
    # Initialize OCR
    ocr = GoogleVisionReceiptOCR()
    
    # Look for receipt files
    receipt_files = [
        'Ferrari_receipt_2578_Jamie_Florence_355_F1.pdf',
        'Ferrari_receipt_2450_Jamie_Florence_355_F1.pdf'
    ]
    
    existing_files = [f for f in receipt_files if os.path.exists(f)]
    
    if not existing_files:
        print(f"\nNo receipt files found. Looking for: {receipt_files}")
        return
    
    print(f"\nFound {len(existing_files)} receipt(s): {existing_files}")
    
    all_results = []
    for receipt_file in existing_files:
        result = ocr.extract_receipt_data(receipt_file)
        ocr.print_results(result)
        all_results.append(result)
    
    # Save results
    output_file = 'google_vision_ocr_results.json'
    with open(output_file, 'w') as f:
        json.dump(all_results, f, indent=2)
    print(f"\n\nResults saved to {output_file}")


if __name__ == "__main__":
    main()