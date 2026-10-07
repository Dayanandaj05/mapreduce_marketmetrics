import sys
import time
import os
import csv
import json
import base64
from collections import defaultdict
from datetime import datetime, timedelta

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from infra.iam import JOB_RUNNER_ROLE

STATE_FILE = os.path.abspath(os.path.join(os.path.dirname(__file__), '../data/job_state.json'))

def update_state(state_msg):
    print(f"[EMR Cluster] {state_msg}")
    with open(STATE_FILE, 'w') as f:
        json.dump({"status": state_msg, "timestamp": datetime.now().isoformat()}, f)

def mapper(file_path):
    update_state("MAPPING: Reading data")
    JOB_RUNNER_ROLE.check_read(file_path)
    
    mapped_data = []
    with open(file_path, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            date = row['timestamp'][:10] # YYYY-MM-DD
            region = row['store_region']
            category = row['product_category']
            revenue = float(row['sale_price']) * int(row['quantity'])
            cost = float(row['item_cost']) * int(row['quantity'])
            
            key = (region, category, date)
            val = (revenue, cost)
            mapped_data.append((key, val))
    return mapped_data

def calculate_forecast(daily_sales_dict):
    sorted_dates = sorted(daily_sales_dict.keys())
    if len(sorted_dates) < 7:
        return 0
    last_7_days = sorted_dates[-7:]
    avg = sum(daily_sales_dict[d] for d in last_7_days) / 7
    return avg

def reducer(mapped_data):
    update_state("REDUCING: Aggregating mapped data and trends")
    sales_per_region = defaultdict(float)
    cost_per_region = defaultdict(float)
    sales_per_category = defaultdict(float)
    cost_per_category = defaultdict(float)
    
    daily_sales_per_region = defaultdict(lambda: defaultdict(float))
    daily_sales_per_category = defaultdict(lambda: defaultdict(float))
    
    for (region, category, date), (revenue, cost) in mapped_data:
        sales_per_region[region] += revenue
        cost_per_region[region] += cost
        sales_per_category[category] += revenue
        cost_per_category[category] += cost
        
        daily_sales_per_region[region][date] += revenue
        daily_sales_per_category[category][date] += revenue

    margin_per_region = {r: ((sales_per_region[r] - cost_per_region[r]) / sales_per_region[r]) * 100 if sales_per_region[r] > 0 else 0 for r in sales_per_region}
    margin_per_category = {c: ((sales_per_category[c] - cost_per_category[c]) / sales_per_category[c]) * 100 if sales_per_category[c] > 0 else 0 for c in sales_per_category}

    ranked_regions = sorted(sales_per_region.items(), key=lambda x: x[1], reverse=True)
    
    trend_per_region = {}
    forecasts_per_region = {}
    for region, dates in daily_sales_per_region.items():
        sorted_dates = sorted(dates.keys())
        trend_per_region[region] = [{"date": d, "sales": dates[d]} for d in sorted_dates]
        forecasts_per_region[region] = calculate_forecast(dates)
        
    trend_per_category = {}
    for category, dates in daily_sales_per_category.items():
        sorted_dates = sorted(dates.keys())
        trend_per_category[category] = [{"date": d, "sales": dates[d]} for d in sorted_dates]

    return {
        "sales_per_region": sales_per_region,
        "margin_per_region": margin_per_region,
        "ranked_regions_by_sales": [{"region": r[0], "sales": r[1]} for r in ranked_regions],
        "sales_per_category": sales_per_category,
        "margin_per_category": margin_per_category,
        "trends": {
            "region": trend_per_region,
            "category": trend_per_category
        },
        "forecasts": {
            "region_next_day_forecast": forecasts_per_region
        }
    }

def run_job(file_path):
    update_state(f"PROVISIONING: Bootstrapping nodes for job using {os.path.basename(file_path)}...")
    time.sleep(1)
    
    mapped_data = mapper(file_path)
    results = reducer(mapped_data)
    
    update_state("WRITING RESULTS: Saving output to S3...")
    bucket_dir = os.path.dirname(file_path)
    output_path = os.path.join(bucket_dir, f"processed_{os.path.basename(file_path).replace('.csv', '.json')}")
    
    JOB_RUNNER_ROLE.check_write(output_path)
    
    payload = json.dumps(results)
    encrypted_payload = base64.b64encode(payload.encode()).decode()
    
    with open(output_path, 'w') as f:
        json.dump({"__SSE_S3_ENCRYPTED__": True, "data": encrypted_payload}, f, indent=2)
        
    update_state("TERMINATED: Cluster shutting down.")
    time.sleep(1)
    
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python job_runner.py <s3_object_path>")
        sys.exit(1)
    run_job(sys.argv[1])
