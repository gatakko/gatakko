import fcntl
import json


class JsonStore:
    def __init__(self, filename, create=False):
        self._filename = filename
        self._create = create
        self._file = None
        self._data = None
        self._modified = False

    def reload(self):
        try:
            self._file.seek(0)
            self._data = json.load(self._file)
            self._modified = False
        except json.JSONDecodeError:
            self._data = {}
            self._modified = True

    def __enter__(self):
        self._file = open(self._filename, 'wb+' if self._create else 'rb+')
        try:
            fcntl.flock(self._file.fileno(), fcntl.LOCK_SH)
            self.reload()
        except:
            self._file.close()
            self._file = None
            self._data = None
            self._modified = False
            raise
        return self

    def __exit__(self, exc, val, tb):
        try:
            if self._modified:
                fcntl.flock(self._file.fileno(), fcntl.LOCK_EX)
                self._file.seek(0)
                content = json.dumps(self._data, separators=(',', ':'))
                self._file.write(content.encode('utf-8'))
                self._file.truncate(len(content))
        finally:
            if self._file is not None:
                self._file.close()
            self._file = None
            self._data = None
            self._modified = False

    def lock(self):
        fcntl.flock(self._file.fileno(), fcntl.LOCK_EX)

    def get(self, key, default=None):
        return self._data.get(key, default)

    def __getitem__(self, key):
        return self._data[key]

    def __setitem__(self, key, value):
        self._data[key] = value
        self._modified = True
