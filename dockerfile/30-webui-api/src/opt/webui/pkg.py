import collections
import re
import apt


def apt_search(query, first=0, count=50):
    if first < 0 or count <= 0:
        return []
    try:
        pat = re.compile(query)
    except re.error:
        return []
    match = []
    found = 0
    for package in apt.cache.Cache():
        if pat.match(package.name):
            if found >= first:
                match.append({
                  'name': package.name,
                  'desc': package.candidate.summary
                })
            found += 1
            if found >= first + count:
                break
    return match


def apt_list(packages):
    cache = apt.cache.Cache()
    roots = set(packages)
    visited = set()
    pkginfo = {}
    total_size = 0
    stack = collections.deque(packages)
    while len(stack) > 0:
        item = stack.pop()
        if item in visited:
            continue
        visited.add(item)
        if item not in cache:
            continue
        version = cache[item].candidate
        if item in roots:
            pkginfo[item] = {'desc': version.summary}
        total_size += version.installed_size
        for dependency in version.get_dependencies('Depends'):
            stack.append(dependency.or_dependencies[0].name)
    return {'packages': pkginfo, 'size': total_size}


def apt_update():
    cache = apt.cache.Cache()
    cache.update()
