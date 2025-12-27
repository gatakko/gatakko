import subprocess


class ExecuteError(Exception):
    def __init__(self, command, status, stderr):
        self.command = command
        self.status = status
        self.stderr = stderr

    def __str__(self):
        if self.status is None:
            return 'Command timed out'
        return f'Command exited with status {self.status}\n{self.stderr}'


def execute(*command, env=None, timeout=10, cwd=None):
    try:
        result = subprocess.run(
            command,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            cwd=cwd,
            env=env,
            timeout=timeout,
            encoding='utf-8',
            text=True,
            check=False
        )
    except subprocess.TimeoutExpired as e:
        raise ExecuteError(command, None, None) from e
    if result.returncode != 0:
        raise ExecuteError(command, result.returncode, result.stderr)
    return result.stdout
