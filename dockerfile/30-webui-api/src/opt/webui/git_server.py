import json
from execute import execute
from git_repo import GitRepo


class GitServer:
    def __init__(self, server='localhost'):
        self.server = server

    def ssh(self, *subcommand):
        return execute('ssh', f'git@{self.server}', *subcommand)

    def info(self):
        return json.loads(self.ssh('info', '-p', '--json'))

    def perms_plus(self, repo_name, role_name, user):
        self.ssh('perms', repo_name, '+', role_name, user)

    def job_status(self, repo_name):
        stdout = self.ssh('job-status', '-h', repo_name)
        result = {}
        for line in stdout.splitlines():
            try:
                key, value = line.split(':', 1)
                result[key] = value.strip()
            except ValueError:
                pass
        return result

    def job_log(self, repo_name):
        return self.ssh('job-status', repo_name)

    def login_log(self, repo_name, count=None):
        stdout = self.ssh(
            'login-log',
            *([] if count is None else ['-n', str(count)]),
            repo_name
        )
        return [json.loads(line) for line in stdout.splitlines()]

    def flavors_available(self):
        return json.loads(self.ssh('adm', 'webui', 'flavors-available'))

    def clone(self, repo_name, work_dir):
        execute(
            'git', 'clone', '--depth=1', '--no-checkout', '--sparse',
            '--filter=blob:none',
            f'git@{self.server}:{repo_name}', work_dir
        )
        return GitRepo(work_dir)
