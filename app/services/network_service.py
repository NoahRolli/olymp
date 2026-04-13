import psutil


def get_interfaces() -> dict:
    interfaces = {}
    for name, addrs in psutil.net_if_addrs().items():
        for addr in addrs:
            if addr.family.name == "AF_INET":
                interfaces[name] = addr.address
    return interfaces