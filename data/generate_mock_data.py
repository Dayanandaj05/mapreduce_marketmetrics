import csv
import random
from datetime import datetime, timedelta
import uuid
import os

# Config
NUM_ROWS = 150000
DAYS = 90
START_DATE = datetime(2023, 1, 1)

REGIONS = ['North', 'South', 'East', 'West', 'Central']
# West is top-performing, South is under-performing.
REGION_WEIGHTS = {'North': 1.0, 'South': 0.4, 'East': 1.0, 'West': 2.0, 'Central': 1.0}

CATEGORIES = ['Electronics', 'Clothing', 'Home', 'Beauty', 'Sports', 'Books', 'Toys', 'Groceries']
# Base margins (sale_price / cost)
CATEGORY_MARGINS = {
    'Electronics': 1.2,
    'Clothing': 2.5,
    'Home': 1.8,
    'Beauty': 3.0,
    'Sports': 1.5,
    'Books': 1.4,
    'Toys': 2.0,
    'Groceries': 1.1
}

# Base prices
CATEGORY_BASE_PRICES = {
    'Electronics': 300.0,
    'Clothing': 40.0,
    'Home': 100.0,
    'Beauty': 25.0,
    'Sports': 60.0,
    'Books': 15.0,
    'Toys': 30.0,
    'Groceries': 5.0
}

# Promotional spike: Electronics between day 40 and 45
PROMO_START_DAY = 40
PROMO_END_DAY = 45
PROMO_CATEGORY = 'Electronics'

def generate_data(filepath):
    print(f"Generating {NUM_ROWS} rows of synthetic data...")
    with open(filepath, 'w', newline='') as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(['transaction_id', 'timestamp', 'store_region', 'product_category', 'item_cost', 'sale_price', 'quantity'])
        
        # We will generate timestamps uniformly, but adjust probability to create patterns
        
        for i in range(NUM_ROWS):
            if i % 10000 == 0:
                print(f"Generated {i} rows...")
            
            # Select random day with slight upward trend weighting
            # We want more transactions towards the end
            day_offset = int(random.triangular(0, DAYS, DAYS * 0.8))
            tx_time = START_DATE + timedelta(days=day_offset, hours=random.randint(8, 20), minutes=random.randint(0, 59))
            
            # Weekday/weekend variation: 30% boost on weekends
            is_weekend = tx_time.weekday() >= 5
            
            # Pick region
            region = random.choices(REGIONS, weights=[REGION_WEIGHTS[r] for r in REGIONS])[0]
            
            # Pick category
            cat_weights = [1.0] * len(CATEGORIES)
            
            # Apply promo spike
            if PROMO_START_DAY <= day_offset <= PROMO_END_DAY:
                cat_weights[CATEGORIES.index(PROMO_CATEGORY)] = 10.0 # Huge spike
            
            category = random.choices(CATEGORIES, weights=cat_weights)[0]
            
            # Pricing
            base_price = CATEGORY_BASE_PRICES[category] * random.uniform(0.8, 1.2)
            margin = CATEGORY_MARGINS[category]
            cost = round(base_price, 2)
            sale = round(base_price * margin, 2)
            
            # Quantity (1 to 5, skewed to 1)
            quantity = int(random.triangular(1, 6, 1))
            
            # If weekend, maybe they buy slightly more quantity
            if is_weekend and random.random() < 0.2:
                quantity += 1
                
            tx_id = str(uuid.uuid4())
            writer.writerow([tx_id, tx_time.isoformat(), region, category, cost, sale, quantity])
            
    print(f"Done. Saved to {filepath}")

if __name__ == '__main__':
    generate_data(os.path.join(os.path.dirname(__file__), 'bucket/raw_transactions.csv'))
