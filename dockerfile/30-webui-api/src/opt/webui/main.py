from wsgiref.simple_server import make_server
from wsgi import app

with make_server('localhost', 8080, app) as httpd:
    httpd.serve_forever()
