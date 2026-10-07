import time
import subprocess
import os
import sys
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

BUCKET_DIR = os.path.join(os.path.dirname(__file__), '../data/bucket')

class S3EventWatcher(FileSystemEventHandler):
    def on_created(self, event):
        if not event.is_directory and event.src_path.endswith('.csv'):
            # Only trigger for raw input, not processed results to avoid loops
            if 'processed' not in event.src_path:
                print(f"[EventBridge] New S3 object detected: {event.src_path}")
                self.trigger_cluster(event.src_path)

    def trigger_cluster(self, file_path):
        print(f"[EventBridge] Provisioning transient EMR cluster for {os.path.basename(file_path)}...")
        runner_path = os.path.join(os.path.dirname(__file__), '../pipeline/job_runner.py')
        
        # Spin up the cluster as an actual independent process
        process = subprocess.Popen([sys.executable, runner_path, file_path])
        print(f"[EventBridge] EMR cluster provisioned (PID {process.pid}).")

if __name__ == "__main__":
    os.makedirs(BUCKET_DIR, exist_ok=True)
    event_handler = S3EventWatcher()
    observer = Observer()
    observer.schedule(event_handler, path=BUCKET_DIR, recursive=False)
    observer.start()
    print(f"EventBridge simulator listening on local S3 bucket: {BUCKET_DIR}")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()
