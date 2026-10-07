class IAMRoleError(Exception):
    pass

class IAMRole:
    def __init__(self, name, allowed_read_exts, allowed_write_exts):
        self.name = name
        self.allowed_read_exts = allowed_read_exts
        self.allowed_write_exts = allowed_write_exts
        
    def check_read(self, file_path):
        if not any(file_path.endswith(ext) for ext in self.allowed_read_exts):
            raise IAMRoleError(f"Role '{self.name}' does not have read permissions for {file_path}")
            
    def check_write(self, file_path):
        if not any(file_path.endswith(ext) for ext in self.allowed_write_exts):
            raise IAMRoleError(f"Role '{self.name}' does not have write permissions for {file_path}")

JOB_RUNNER_ROLE = IAMRole("JobRunner", allowed_read_exts=['.csv'], allowed_write_exts=['.json'])
DASHBOARD_ROLE = IAMRole("DashboardBackend", allowed_read_exts=['.json'], allowed_write_exts=[])
