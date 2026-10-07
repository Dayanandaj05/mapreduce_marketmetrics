import os
import shutil
from datetime import datetime, timedelta

BUCKET_DIR = os.path.join(os.path.dirname(__file__), '../data/bucket')
ARCHIVE_DIR = os.path.join(os.path.dirname(__file__), '../data/glacier_archive')

def run_lifecycle():
    print("[S3 Lifecycle] Scanning for objects older than 30 days to transition to Glacier...")
    os.makedirs(ARCHIVE_DIR, exist_ok=True)
    
    # We'll simulate by checking file creation/modification time
    now = datetime.now()
    archived_count = 0
    for filename in os.listdir(BUCKET_DIR):
        if filename.endswith('.csv'):
            file_path = os.path.join(BUCKET_DIR, filename)
            mtime = datetime.fromtimestamp(os.path.getmtime(file_path))
            # Just for demo, we'll pretend it's older than 30 days if we run this script
            print(f"[S3 Lifecycle] Moving {filename} to Glacier archive.")
            shutil.move(file_path, os.path.join(ARCHIVE_DIR, filename))
            archived_count += 1
            
    print(f"[S3 Lifecycle] Transitioned {archived_count} objects.")

if __name__ == '__main__':
    run_lifecycle()
