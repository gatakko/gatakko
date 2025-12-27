import json
import os
import re
import shutil
from execute import ExecuteError
from git_server import GitServer
from git_repo import GitRepo
from request import UPLOAD_SIZE_MAX
from response import BadRequest, Forbidden
from session import Session, create_session
from dispatch import route, identity, fullmatch

try:
    from pkg import apt_search, apt_list
except ModuleNotFoundError:
    from pkg_dummy import apt_search, apt_list

try:
    from auth import authenticate
except ModuleNotFoundError:
    from auth_dummy import authenticate

GIT_SERVER = os.environ.get('GIT_SERVER', 'localhost')
WEBUI = {'user': 'webui', 'email': 'webui@cluster.local'}
REPO_RE = 'flavor(?:/[0-9A-Za-z][0-9A-Za-z_-]*)*'
FILENAME_RE = '[^/]+(?:/[^/]+)*'
REPO_PAT = re.compile(REPO_RE)
PERM_PAT = re.compile('[0-7]{3}')
PULL_FLAGS_PAT = re.compile('[ec]')


@route('GET', '/api/search', [int, int, identity])
def search(_req, _res, first, count, query):
    return apt_search(query, first, count)


@route('GET', '/api/pkginfo', identity)
def pkginfo(_req, _res, *packages):
    return apt_list(packages)


@route('POST', '/api/login')
def login(req, res):
    if not isinstance(req.body, dict):
        raise BadRequest()
    user = req.body.get('user')
    password = req.body.get('pass')
    if not (isinstance(user, str) and isinstance(password, str)):
        raise BadRequest()
    if not authenticate(user, password):
        raise Forbidden('Authentication failed')  # login failed
    return create_session(user, res)


@route('POST', '/api/logout')
def logout(req, res):
    with Session(req) as session:
        session.logout(res)
        return {}


@route('POST', '/api/refresh')
def refresh(req, res):
    with Session(req) as session:
        return session.refresh(res)


@route('GET', '/api/flavors')
def flavors(req, _res):
    with Session(req):
        git = GitServer(GIT_SERVER)
        flavor_dict = {}
        for flavor in git.flavors_available():
            flavor_dict[flavor['id']] = flavor
        result = {}
        for repo_name in git.info()['repos']:
            if REPO_PAT.fullmatch(repo_name):
                result[repo_name] = flavor_dict.get(repo_name)
        return result


@route('GET', f'/api/status/({REPO_RE})')
def status(req, _res, repo_name):
    with Session(req):
        return GitServer(GIT_SERVER).job_status(repo_name)


@route('GET', f'/api/log/({REPO_RE})')
def log(req, _res, repo_name):
    with Session(req):
        return GitServer(GIT_SERVER).job_log(repo_name)


@route('GET', f'/api/last/({REPO_RE})', [int])
def last(req, _res, repo_name, count):
    with Session(req):
        return GitServer(GIT_SERVER).login_log(repo_name, count)


def _repo_dir(session, must_exist=True, remove=False):
    repo_dir = os.path.join(session.dir(), 'repo')
    if os.path.isdir(repo_dir):
        if remove:
            shutil.rmtree(repo_dir, ignore_errors=True)
    else:
        if must_exist:
            raise Forbidden('Not ready')
    return repo_dir


def _get_revision(repo):
    try:
        return repo.rev_parse()
    except ExecuteError:
        return None


def _get_manifest_json(repo, none_if_error=False):
    try:
        content = repo.cat_file('manifest.json')
    except ExecuteError:
        return None if none_if_error else {}
    try:
        manifest = json.loads(content)
    except json.JSONDecodeError:
        manifest = None if none_if_error else {}
    if not isinstance(manifest, dict):
        manifest = None if none_if_error else {}
    return manifest


def _list_src_files(repo, ls_files=False):
    try:
        files = repo.ls_files('src') if ls_files else repo.ls_tree('src')
    except ExecuteError:
        return {}
    result = {}
    for path in sorted(files):
        result[path.removeprefix('src/')] = files[path]
    return result


def _check_owner(session, repo):
    manifest = _get_manifest_json(repo)
    webui = manifest.get('webui')
    if isinstance(webui, dict):
        owners = webui.get('owners')
        if isinstance(owners, list):
            if session.data['user'] not in owners:
                raise Forbidden('Permission denied')


@route('POST', '/api/pull', [fullmatch(PULL_FLAGS_PAT), fullmatch(REPO_PAT)])
def pull(req, res, flags, repo_name):
    with Session(req) as session:
        session.data.lock()
        repo_dir = _repo_dir(session, must_exist=False, remove=True)
        git = GitServer(GIT_SERVER)
        if 'e' in flags and repo_name not in git.info()['repos']:
            raise Forbidden('Repository not found')
        repo = git.clone(repo_name, repo_dir)
        if 'c' in flags:
            if _get_revision(repo) is not None:
                raise Forbidden('Repository exists')
            git.perms_plus(repo_name, 'WRITERS', session.data["user"])
        return session.refresh(res)  # escalation


@route('GET', '/api/repo')
def repo_info(req, _res):
    with Session(req) as session:
        repo = GitRepo(_repo_dir(session))
        rev = _get_revision(repo)
        manifest = _get_manifest_json(repo, none_if_error=True)
        files = _list_src_files(repo)
        return {'rev': rev, 'manifest': manifest, 'files': files}


@route('GET', f'/api/repo/({FILENAME_RE})')
def get(req, res, file_name):
    with Session(req) as session:
        session.data.lock()
        repo = GitRepo(_repo_dir(session))
        if _get_revision(repo) is not None:
            repo.sparse_checkout_add('src')
            repo.checkout()
        res.content_type = 'application/octet-stream'
        with repo.chdir():
            try:
                path = os.path.join('src', file_name)
                size = os.path.getsize(path)
                if size > UPLOAD_SIZE_MAX:
                    raise Forbidden('Content too large')
                with open(path, 'rb') as file:
                    return file.read()
            except OSError as e:
                raise Forbidden(f'Error: {str(e)}') from e


@route('PUT', f'/api/repo/({FILENAME_RE})', [fullmatch(PERM_PAT)])
def add(req, _res, file_name, perm):
    mode = int(perm, 8)
    with Session(req) as session:
        session.data.lock()
        repo = GitRepo(_repo_dir(session))
        if _get_revision(repo) is not None:
            repo.sparse_checkout_add('src')
            repo.checkout()
        try:
            repo.add(os.path.join('src', file_name), req.body, mode)
        except OSError as e:
            raise Forbidden(f'Error: {str(e)}') from e
        return _list_src_files(repo, ls_files=True)


@route('DELETE', f'/api/repo/({FILENAME_RE})')
def rm(req, _res, file_name):
    with Session(req) as session:
        session.data.lock()
        repo = GitRepo(_repo_dir(session))
        if _get_revision(repo) is not None:
            repo.sparse_checkout_add('src')
            repo.checkout()
        try:
            repo.rm(os.path.join('src', file_name))
        except OSError as e:
            raise Forbidden(f'Error: {str(e)}') from e
        return _list_src_files(repo, ls_files=True)


@route('POST', '/api/push')
def push(req, _res):
    with Session(req) as session:
        session.data.lock()
        repo_dir = _repo_dir(session)
        repo = GitRepo(repo_dir)
        _check_owner(session, repo)
        rev = _get_revision(repo)
        if rev is not None:
            repo.sparse_checkout_add('src')
            repo.checkout()
        content = json.dumps(req.body, ensure_ascii=False, indent=2)
        repo.add('manifest.json', content.encode('utf-8'))
        if repo.is_modified():
            verb = 'created' if rev is None else 'updated'
            repo.commit(f'{verb} by {session.data["user"]}', **WEBUI)
            try:
                repo.push()
            except ExecuteError as e:
                raise Forbidden(f'Error: {str(e)}') from e
        shutil.rmtree(repo_dir, ignore_errors=True)
        return {}
