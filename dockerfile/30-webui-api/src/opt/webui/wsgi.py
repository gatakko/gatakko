from request import Request
from response import HTTPError, Response
from dispatch import dispatch
import app as _app
import daemon

daemon.start()


def app(environ, start_response):
    try:
        req = Request(environ)
        res = Response()
        ret = dispatch(req, res)
        start_response(*res.response())
        return [res.body(ret)]
    except HTTPError as e:
        start_response(*e.response.response())
        return [e.response.body(e.body)]
