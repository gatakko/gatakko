import random
import threading
from session import SESSION_TIMEOUT, reap_sessions

try:
    from pkg import apt_update
except ModuleNotFoundError:
    from pkg_dummy import apt_update

def _reaper_main():
    reap_sessions()
    _start_reaper()


def _start_reaper():
    seconds = random.randrange(10, 100) * SESSION_TIMEOUT
    t = threading.Timer(seconds, _reaper_main)
    t.daemon = True
    t.start()


def _indexer_main():
    apt_update()
    _start_indexer()


def _start_indexer():
    seconds = random.randrange(259200, 1209600)
    t = threading.Timer(seconds, _indexer_main)
    t.daemon = True
    t.start()


def start():
    random.seed()
    _start_reaper()
    _start_indexer()
