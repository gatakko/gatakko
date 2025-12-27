import os
from execute import execute, ExecuteError
from chdir import Chdir


def _parse_file_list(stdout):
    result = {}
    for item in stdout.split('\0'):
        if item:
            mode, path = item.split(' ', 1)
            result[path] = int(mode[3:6], 8)
    return result


class GitRepo:
    def __init__(self, work_dir):
        self._dir = work_dir

    def chdir(self):
        return Chdir(self._dir)

    def rev_parse(self):
        return execute('git', 'rev-parse', 'HEAD', '--', cwd=self._dir).strip()

    def cat_file(self, path):
        return execute('git', 'cat-file', '-p', f'HEAD:{path}', cwd=self._dir)

    def ls_tree(self, path):
        stdout = execute(
            'git', 'ls-tree', '-r', '-z', '--format=%(objectmode) %(path)',
            'HEAD', path,
            cwd=self._dir
        )
        return _parse_file_list(stdout)

    def ls_files(self, path):
        stdout = execute(
            'git', 'ls-files', '-z', '--format=%(objectmode) %(path)', path,
            cwd=self._dir
        )
        return _parse_file_list(stdout)

    def sparse_checkout_add(self, *paths):
        execute('git', 'sparse-checkout', 'add', *paths, cwd=self._dir)

    def checkout(self):
        execute('git', 'checkout', '-q', cwd=self._dir)

    def add(self, path, content, mode=0o644):
        with self.chdir():
            dir = os.path.dirname(path)
            if dir:
                os.makedirs(dir, exist_ok=True)
            with open(path, 'wb') as file:
                file.write(content)
            os.chmod(path, mode)
            execute('git', 'add', path)

    def rm(self, path):
        with self.chdir():
            os.remove(path)
            execute('git', 'add', path)

    def is_modified(self):
        try:
            execute('git', 'diff', '--quiet', '--cached', cwd=self._dir)
            return False
        except ExecuteError as e:
            if e.status != 1:
                raise
            return True

    def commit(self, message, user, email):
        execute(
            'git', 'commit', '-m', message,
            cwd=self._dir,
            env={
                'GIT_AUTHOR_NAME': user,
                'GIT_AUTHOR_EMAIL': email,
                'GIT_COMMITTER_NAME': user,
                'GIT_COMMITTER_EMAIL': email
            }
        )

    def push(self):
        execute('git', 'push', '-q', cwd=self._dir)
