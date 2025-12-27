import http.cookies
import json
import urllib.parse
import os
from response import BadRequest, HTTPError, SECURE_COOKIE

UPLOAD_SIZE_MAX = int(os.environ.get('UPLOAD_SIZE_MAX', '4194304'))


def _check_csrf(environ):
    if environ['REQUEST_METHOD'] not in ('GET', 'HEAD'):
        origin = environ.get('HTTP_ORIGIN')
        host = environ.get('HTTP_HOST')
        if not origin or not host:
            raise BadRequest()
        if urllib.parse.urlparse(origin).netloc != host:
            raise BadRequest()
        if environ.get('HTTP_SEC_FETCH_SITE', 'same-origin') != 'same-origin':
            raise BadRequest()


def _get_body(environ):
    try:
        length = int(environ['CONTENT_LENGTH'])
    except (ValueError, KeyError) as e:
        raise BadRequest() from e
    if length > UPLOAD_SIZE_MAX:
        raise HTTPError('413 Large', 'content too large')
    return environ['wsgi.input'].read(length)


class Request:
    def __init__(self, environ):
        _check_csrf(environ)

        self.method = environ['REQUEST_METHOD']
        self.query = environ.get('QUERY_STRING', '')
        self.path = environ.get('PATH_INFO', '')

        if self.method == 'POST':
            if environ.get('CONTENT_TYPE') != 'application/json':
                raise BadRequest()
            try:
                self.body = json.loads(_get_body(environ))
            except json.JSONDecodeError as e:
                raise BadRequest() from e
        elif self.method == 'PUT':
            if environ.get('CONTENT_TYPE') != 'application/octet-stream':
                raise BadRequest()
            self.body = _get_body(environ)
        else:
            self.body = None

        self._cookie = http.cookies.SimpleCookie()
        if 'HTTP_COOKIE' in environ:
            self._cookie.load(environ['HTTP_COOKIE'])

    def get_cookie(self, key):
        item = self._cookie.get(f'__Host-{key}' if SECURE_COOKIE else key)
        return None if item is None else item.value
