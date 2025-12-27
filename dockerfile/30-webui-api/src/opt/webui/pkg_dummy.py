def apt_search(query, first=0, count=50):
    return []


def apt_list(packages):
    result = {}
    for item in packages:
        result[item] = {'desc': 'dummy description'}
    return {'packages': result, 'size': 12345}


def apt_update():
    pass
