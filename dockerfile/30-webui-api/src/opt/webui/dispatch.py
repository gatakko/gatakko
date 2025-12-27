import urllib.parse
import re
from response import BadRequest, HTTPError

ROUTES = {}


def identity(item):
    return item


def fullmatch(pat):
    def _match(item):
        if not pat.fullmatch(item):
            raise BadRequest()
        return item
    return _match


def route(method, path, query_trans=None):
    def _add_route(func):
        if path in ROUTES:
            ROUTES[path][1][method] = (query_trans, func)
        else:
            ROUTES[path] = (re.compile(path), {method: (query_trans, func)})
        return func
    return _add_route


def dispatch(req, res):
    for path_pat, methods in ROUTES.values():
        path_match = path_pat.fullmatch(req.path)
        if path_match:
            if req.method not in methods:
                raise HTTPError('405 Method Not Allowed')
            query_trans, func = methods[req.method]
            args = [*map(urllib.parse.unquote, req.query.split('&'))]
            try:
                if query_trans is None:
                    if args != ['']:
                        raise BadRequest()
                    args = []
                elif callable(query_trans):
                    args = query_trans(args)
                elif len(args) != len(query_trans):
                    raise BadRequest()
                else:
                    args = [query_trans[i](args[i]) for i in range(len(args))]
            except ValueError as e:
                raise BadRequest() from e
            return func(req, res, *path_match.groups(), *args)
    raise HTTPError('404 Not Found')
