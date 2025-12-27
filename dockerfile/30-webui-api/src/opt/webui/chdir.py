import os

class Chdir:
    def __init__(self, dir):
        self._dir = dir
        self._olddir = None

    def __enter__(self):
        if self._olddir is None:
            self._olddir = os.getcwd()
            os.chdir(self._dir)
        return self._olddir

    def __exit__(self, exc, val, tb):
        if self._olddir is not None:
            os.chdir(self._olddir)
            self._olddir = None
