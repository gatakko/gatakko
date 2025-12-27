import base64
import os
import tempfile
import time
import shutil
import sys
from json_store import JsonStore
from response import Forbidden

SESSION_DIR = os.environ.get('SESSION_DIR', 'sessions')
SESSION_TIMEOUT = int(os.environ.get('SESSION_TIMEOUT', '1200'))


def _create_session_dir():
    rand = base64.urlsafe_b64encode(os.urandom(9)).decode()
    return tempfile.mkdtemp(rand[0:6], rand[6:12], SESSION_DIR)


def _remove_session_dir(session_id):
    shutil.rmtree(os.path.join(SESSION_DIR, session_id), ignore_errors=True)


def _rename_session_dir(session_id):
    olddir = os.path.join(SESSION_DIR, session_id)
    newdir = _create_session_dir()
    try:
        for item in os.listdir(olddir):
            os.rename(os.path.join(olddir, item), os.path.join(newdir, item))
        shutil.rmtree(olddir, ignore_errors=True)
        return os.path.basename(newdir)
    except:
        shutil.rmtree(newdir, ignore_errors=True)
        raise


def create_session(user, res):
    now = time.time()
    session_dir = _create_session_dir()
    try:
        with JsonStore(os.path.join(session_dir, 'data.json'), True) as data:
            data['user'] = user
            data['start'] = now
    except:
        shutil.rmtree(session_dir, ignore_errors=True)
        raise
    session_id = os.path.basename(session_dir)
    res.set_cookie('id', session_id)
    res.headers.append(('Cache-Control', 'no-store'))
    return {'user': user, 'ttl': now + SESSION_TIMEOUT}


class Session:
    def __init__(self, req):
        self.req = req
        self.id = None
        self.data = None

    def dir(self):
        return os.path.join(SESSION_DIR, self.id)

    def __enter__(self):
        self.id = self.req.get_cookie('id')
        if not self.id:
            raise Forbidden('Session closed')  # token not given
        self.data = JsonStore(os.path.join(self.dir(), 'data.json'))
        try:
            self.data.__enter__()
        except OSError as e:
            raise Forbidden('Session closed') from e  # no such session
        try:
            start = self.data['start']
            if start + SESSION_TIMEOUT < time.time():
                _remove_session_dir(self.id)
                raise Forbidden('Session closed')  # session expired
            return self
        except:
            self.data.__exit__(*sys.exc_info())
            raise

    def __exit__(self, exc, val, tb):
        if self.data is not None:
            self.data.__exit__(exc, val, tb)

    def refresh(self, res):
        start = self.data['start']
        self.data.lock()
        self.data.reload()
        if start != self.data['start']:
            raise Forbidden('Session closed')  # session has been refreshed
        new_id = _rename_session_dir(self.id)
        self.data['start'] = time.time()
        self.id = new_id
        res.set_cookie('id', new_id, max_age=SESSION_TIMEOUT)
        res.headers.append(('Cache-Control', 'no-store'))
        return {'user': self.data['user'],
                'ttl': self.data['start'] + SESSION_TIMEOUT}

    def logout(self, res):
        _remove_session_dir(self.id)
        res.set_cookie('id', '', max_age=0)


def reap_sessions():
    now = time.time()
    try:
        sessions = os.listdir(SESSION_DIR)
    except OSError:
        return
    for session_id in sessions:
        try:
            data_json = os.path.join(SESSION_DIR, session_id, 'data.json')
            with JsonStore(data_json) as data:
                data.lock()
                start = data['start']
                if start is None or start + SESSION_TIMEOUT < now:
                    _remove_session_dir(session_id)
        except OSError:
            _remove_session_dir(session_id)
