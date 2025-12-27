import http.cookies
import json
import os

SECURE_COOKIE = os.environ.get('SECURE_COOKIE', 'true') == 'true'


class Response:
    def __init__(self, status='200 OK'):
        self.status = status
        self.content_type = 'application/json'
        self.headers = []

    def set_cookie(self, key, value, max_age=None):
        cookie = http.cookies.SimpleCookie()
        if SECURE_COOKIE:
            key = f'__Host-{key}'
        cookie[key] = value
        cookie[key]['path'] = '/'
        cookie[key]['samesite'] = 'Strict'
        cookie[key]['httponly'] = True
        if SECURE_COOKIE:
            cookie[key]['secure'] = True
        if max_age is not None:
            cookie[key]['max-age'] = max_age
        self.headers.append(('Set-Cookie', cookie.output(header='').strip()))

    def response(self):
        headers = [('Content-Type', self.content_type), *self.headers]
        return [self.status, headers]

    def body(self, data):
        if self.content_type == 'application/json':
            data = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
            return data.encode('utf-8')
        return data


class HTTPError(Exception):
    def __init__(self, status, body=None):
        self.response = Response(status)
        self.body = body

    def __str__(self):
        return str(self.body)


class BadRequest(HTTPError):
    def __init__(self, body='bad request'):
        super().__init__('400 Bad Request', body)


class Forbidden(HTTPError):
    def __init__(self, body='forbidden'):
        super().__init__('403 Forbidden', body)
