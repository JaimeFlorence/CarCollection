#!/usr/bin/env python3
"""
OCR Receipt Proof of Concept using Tesseract
Extracts service information from repair shop receipts
"""

import os
import re
from datetime import datetime
from decimal import Decimal
from typing import Dict, List, Optional, Tuple
import json

# Check if required packages are installed
try:
    import pytesseract
    from PIL import Image
    import cv2
    import numpy as np
    import pdf2image
except ImportError as e:
    print(f"Missing required package: {e}")
    print("\nPlease install required packages:")
    print("pip install pytesseract pillow opencv-python numpy pdf2image")
    print("\nAlso install Tesseract OCR:")
    print("Ubuntu/Debian: sudo apt-get install tesseract-ocr")
    print("Mac: brew install tesseract")
    print("Windows: Download from https://github.com/UB-Mannheim/tesseract/wiki")
    print("\nFor PDF support, also install poppler:")
    print("Ubuntu/Debian: sudo apt-get install poppler-utils")
    print("Mac: brew install poppler")
    exit(1)


class ReceiptOCR:
    """Extract service information from repair receipts using OCR"""
    
    def __init__(self):
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
        self.parts_keywords = ['part', 'filter', 'oil', 'brake', 'tire', 'belt', 'fluid', 'coolant']
        self.labor_keywords = ['labor', 'service', 'install', 'replace', 'diagnose', 'inspect']
        self.tax_keywords = ['tax', 'taxes', 'gst', 'pst', 'hst', 'vat']
        
    def preprocess_image(self, image_path: str) -> np.ndarray:
        """Preprocess image for better OCR results"""
        # Check if it's a PDF
        if image_path.lower().endswith('.pdf'):
            # Convert PDF to images
            images = pdf2image.convert_from_path(image_path, dpi=300)
            if not images:
                raise ValueError("No pages found in PDF")
            # Use first page for now
            img = np.array(images[0])
            # Convert PIL image to OpenCV format
            img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
        else:
            # Read image
            img = cv2.imread(image_path)
            
        if img is None:
            raise ValueError(f"Could not read image from {image_path}")
        
        # Convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Apply threshold to get black and white image
        _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
        # Denoise
        denoised = cv2.fastNlMeansDenoising(thresh)
        
        # Resize if image is too small
        height, width = denoised.shape
        if width < 1000:
            scale = 1500 / width
            new_width = int(width * scale)
            new_height = int(height * scale)
            denoised = cv2.resize(denoised, (new_width, new_height), interpolation=cv2.INTER_CUBIC)
        
        return denoised
    
    def extract_text(self, image_path: str) -> Tuple[str, Dict]:
        """Extract text from image using Tesseract"""
        try:
            # Preprocess image
            processed_img = self.preprocess_image(image_path)
            
            # Get OCR data with confidence scores
            data = pytesseract.image_to_data(processed_img, output_type=pytesseract.Output.DICT)
            
            # Get plain text
            text = pytesseract.image_to_string(processed_img)
            
            return text, data
        except Exception as e:
            print(f"Error during OCR: {e}")
            return "", {}
    
    def find_dates(self, text: str) -> List[str]:
        """Extract dates from text"""
        dates = []
        for pattern in self.date_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            dates.extend(matches)
        return dates
    
    def find_money_amounts(self, text: str) -> List[Tuple[str, float]]:
        """Extract money amounts with their context"""
        amounts = []
        lines = text.split('\n')
        
        for line in lines:
            for pattern in self.money_patterns:
                matches = re.finditer(pattern, line)
                for match in matches:
                    amount_str = match.group(1).replace(',', '')
                    try:
                        amount = float(amount_str)
                        # Get context (the text before the amount)
                        context = line[:match.start()].strip()
                        amounts.append((context, amount))
                    except ValueError:
                        pass
        
        return amounts
    
    def find_invoice_number(self, text: str) -> Optional[str]:
        """Extract invoice/work order number"""
        for pattern in self.invoice_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1)
        return None
    
    def find_shop_info(self, text: str) -> Dict[str, str]:
        """Extract shop name and address from top of receipt"""
        lines = text.split('\n')[:10]  # Usually in first 10 lines
        
        shop_info = {
            'name': '',
            'address': '',
            'phone': ''
        }
        
        # Phone pattern
        phone_pattern = r'(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})'
        
        for i, line in enumerate(lines):
            line = line.strip()
            if not line:
                continue
                
            # First non-empty line is often shop name
            if not shop_info['name'] and len(line) > 3:
                shop_info['name'] = line
            
            # Look for phone
            phone_match = re.search(phone_pattern, line)
            if phone_match:
                shop_info['phone'] = phone_match.group(1)
            
            # Address often contains street keywords
            if any(word in line.lower() for word in ['street', 'st', 'avenue', 'ave', 'road', 'rd', 'blvd']):
                shop_info['address'] = line
        
        return shop_info
    
    def categorize_line_items(self, amounts: List[Tuple[str, float]]) -> Dict[str, List[Tuple[str, float]]]:
        """Categorize amounts into parts, labor, tax, etc."""
        categorized = {
            'parts': [],
            'labor': [],
            'tax': [],
            'other': [],
            'total': []
        }
        
        for context, amount in amounts:
            context_lower = context.lower()
            
            # Check for total
            if any(word in context_lower for word in ['total', 'amount due', 'balance']):
                categorized['total'].append((context, amount))
            # Check for tax
            elif any(word in context_lower for word in self.tax_keywords):
                categorized['tax'].append((context, amount))
            # Check for parts
            elif any(word in context_lower for word in self.parts_keywords):
                categorized['parts'].append((context, amount))
            # Check for labor
            elif any(word in context_lower for word in self.labor_keywords):
                categorized['labor'].append((context, amount))
            else:
                categorized['other'].append((context, amount))
        
        return categorized
    
    def extract_receipt_data(self, image_path: str) -> Dict:
        """Main method to extract all data from receipt"""
        print(f"\nProcessing: {image_path}")
        print("-" * 50)
        
        # Extract text
        text, ocr_data = self.extract_text(image_path)
        
        if not text:
            return {'error': 'No text extracted from image'}
        
        # Extract various components
        dates = self.find_dates(text)
        amounts = self.find_money_amounts(text)
        invoice_num = self.find_invoice_number(text)
        shop_info = self.find_shop_info(text)
        categorized = self.categorize_line_items(amounts)
        
        # Calculate totals
        parts_total = sum(amt for _, amt in categorized['parts'])
        labor_total = sum(amt for _, amt in categorized['labor'])
        tax_total = sum(amt for _, amt in categorized['tax'])
        
        # Find the most likely total
        receipt_total = 0
        if categorized['total']:
            # Get the largest "total" amount
            receipt_total = max(amt for _, amt in categorized['total'])
        
        result = {
            'image_file': os.path.basename(image_path),
            'shop_name': shop_info['name'],
            'shop_phone': shop_info['phone'],
            'shop_address': shop_info['address'],
            'invoice_number': invoice_num,
            'dates_found': dates,
            'service_date': dates[0] if dates else None,
            'parts_total': parts_total,
            'labor_total': labor_total,
            'tax_total': tax_total,
            'receipt_total': receipt_total,
            'parts_items': categorized['parts'],
            'labor_items': categorized['labor'],
            'tax_items': categorized['tax'],
            'other_items': categorized['other'],
            'all_totals_found': categorized['total'],
            'raw_text': text[:500] + '...' if len(text) > 500 else text
        }
        
        return result
    
    def print_results(self, data: Dict):
        """Pretty print the extracted data"""
        print("\n=== EXTRACTED RECEIPT DATA ===")
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
        
        if data['parts_items']:
            print("\n--- PARTS ---")
            for desc, amt in data['parts_items']:
                print(f"  {desc}: ${amt:.2f}")
        
        if data['labor_items']:
            print("\n--- LABOR ---")
            for desc, amt in data['labor_items']:
                print(f"  {desc}: ${amt:.2f}")
        
        print("\n--- RAW TEXT SAMPLE ---")
        print(data['raw_text'])


def main():
    """Test the OCR on receipt images"""
    ocr = ReceiptOCR()
    
    # Look for receipt images in the current directory
    image_extensions = ['.jpg', '.jpeg', '.png', '.pdf']
    receipt_files = []
    
    print("Looking for receipt images...")
    for file in os.listdir('.'):
        if any(file.lower().endswith(ext) for ext in image_extensions):
            if 'receipt' in file.lower() or 'ferrari' in file.lower():
                receipt_files.append(file)
    
    if not receipt_files:
        print("\nNo receipt images found!")
        print("Please place your Ferrari receipt images in the current directory.")
        print("Files should contain 'receipt' or 'ferrari' in the filename.")
        return
    
    print(f"\nFound {len(receipt_files)} receipt(s): {receipt_files}")
    
    all_results = []
    for receipt_file in receipt_files:
        try:
            result = ocr.extract_receipt_data(receipt_file)
            ocr.print_results(result)
            all_results.append(result)
        except Exception as e:
            print(f"\nError processing {receipt_file}: {e}")
    
    # Save results to JSON
    if all_results:
        output_file = 'ocr_results.json'
        with open(output_file, 'w') as f:
            json.dump(all_results, f, indent=2)
        print(f"\n\nResults saved to {output_file}")


if __name__ == "__main__":
    main()