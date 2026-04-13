import psutil
import os


def get_system_info() -> dict:
    temp = psutil.sensors_temperatures()
    cpu_temp = temp.get("coretemp", [{}])[0].current if temp.get("coretemp") else None

    tresor = None
    if os.path.ismount("/mnt/tresor"):
        usage = psutil.disk_usage("/mnt/tresor")
        tresor = {
            "total_gb": round(usage.total / (1024**3), 1),
            "used_gb": round(usage.used / (1024**3), 1),
            "percent": usage.percent,
        }

    root_usage = psutil.disk_usage("/")
    mem = psutil.virtual_memory()

    return {
        "cpu_percent": psutil.cpu_percent(interval=1),
        "cpu_count": psutil.cpu_count(),
        "memory": {
            "total_gb": round(mem.total / (1024**3), 1),
            "used_gb": round(mem.used / (1024**3), 1),
            "percent": mem.percent,
        },
        "disk_root": {
            "total_gb": round(root_usage.total / (1024**3), 1),
            "used_gb": round(root_usage.used / (1024**3), 1),
            "percent": root_usage.percent,
        },
        "disk_tresor": tresor,
        "temperature_c": cpu_temp,
        "uptime_seconds": int(psutil.boot_time()),
    }